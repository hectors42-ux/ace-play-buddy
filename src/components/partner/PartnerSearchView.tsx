import { useState, useMemo, useEffect } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { Sparkles, Inbox, Send, Search, Plus, Calendar } from "lucide-react";
import { useUserAvailability } from "@/hooks/useUserAvailability";
import { usePartnerSuggestions, type PartnerSuggestion } from "@/hooks/usePartnerSuggestions";
import { useMatchInvitations } from "@/hooks/useMatchInvitations";
import { useMatchOpenPosts } from "@/hooks/useMatchOpenPosts";
import { useMyRating } from "@/hooks/useMyRating";
import { useMatchSearchFilters } from "@/hooks/useMatchSearchFilters";
import { useAuth } from "@/components/providers/AuthProvider";
import { RecentPartnersStrip } from "./RecentPartnersStrip";
import { PartnerSearchFiltersCard } from "./PartnerSearchFiltersCard";
import { PartnerSwipeStack } from "./PartnerSwipeStack";
import { PartnerOnboardingSheet } from "./PartnerOnboardingSheet";
import { InvitePartnerDialog } from "./InvitePartnerDialog";
import { MatchSentDialog } from "./MatchSentDialog";
import { OpenChallengeComposer } from "./OpenChallengeComposer";
import { OpenChallengeCard } from "./OpenChallengeCard";
import { InvitationItem } from "./InvitationItem";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type SearchPhase = "filters" | "swiping" | "empty";

interface PartnerLite {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
}

export const PartnerSearchView = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const { hasAvailability, loading: availLoading, refresh: refreshAvail } = useUserAvailability();
  const { rating } = useMyRating();
  const { rows: suggestions, loading: sugLoading, refresh: refreshSug } = usePartnerSuggestions(50);
  const { received, sent, refresh: refreshInv } = useMatchInvitations();
  const { posts, loading: postsLoading, currentUserId, refresh: refreshPosts } = useMatchOpenPosts();
  const { filters, setFilters, persist } = useMatchSearchFilters();

  const [phase, setPhase] = useState<SearchPhase>("filters");
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showOpenComposer, setShowOpenComposer] = useState(false);
  const [invitePartner, setInvitePartner] = useState<PartnerLite | null>(null);
  const [matchSent, setMatchSent] = useState<{ partner: PartnerLite; score?: number | null } | null>(null);
  const [skipped, setSkipped] = useState<Set<string>>(new Set());
  const [mainTab, setMainTab] = useState<string>("sugeridos");
  const [invTab, setInvTab] = useState<string>("recibidas");

  // Filtrado client-side de las sugerencias según los filtros locales
  const filteredSuggestions = useMemo(() => {
    return suggestions.filter((s) => {
      if (skipped.has(s.user_id)) return false;
      if (s.level_diff != null && Math.abs(s.level_diff) > filters.level_delta + 0.01) return false;
      return true;
    });
  }, [suggestions, skipped, filters.level_delta]);

  const pendingReceived = received.filter((i) => i.status === "pending").length;
  const pendingSent = sent.filter((i) => i.status === "pending").length;

  const needsOnboarding = !availLoading && !hasAvailability;

  // Si terminó las cards en estado swiping → empty
  useEffect(() => {
    if (phase === "swiping" && !sugLoading && filteredSuggestions.length === 0) {
      setPhase("empty");
    }
  }, [phase, sugLoading, filteredSuggestions.length]);

  if (needsOnboarding && !showOnboarding) {
    return (
      <>
        <EmptyState
          icon={Calendar}
          title="Antes de buscar partner"
          description="Cuéntanos cuándo sueles poder jugar para sugerirte socios compatibles y aparecer en sus búsquedas."
          action={{
            label: "Configurar disponibilidad",
            onClick: () => setShowOnboarding(true),
          }}
        />
        <PartnerOnboardingSheet
          open={showOnboarding}
          onClose={() => setShowOnboarding(false)}
          onSaved={() => {
            refreshAvail();
            refreshSug();
            setPhase("filters");
          }}
        />
      </>
    );
  }

  const startSearch = async () => {
    await persist();
    setSkipped(new Set());
    await refreshSug();
    setPhase("swiping");
  };

  const handleInvite = (p: PartnerLite | PartnerSuggestion) => {
    setInvitePartner({
      user_id: p.user_id,
      first_name: p.first_name,
      last_name: p.last_name,
      avatar_url: p.avatar_url,
    });
  };

  const cancelOwnPost = async (id: string) => {
    const { error } = await supabase
      .from("match_open_posts")
      .update({ status: "cancelled" })
      .eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Reto cancelado" });
      refreshPosts();
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-end justify-between px-1">
        <div>
          <h2 className="font-display text-2xl font-semibold tracking-tight">
            Encuentra tu Partner
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Filtra, desliza e invita. Tu próximo partido a un swipe.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1 text-[11px] text-muted-foreground"
          onClick={() => setShowOnboarding(true)}
        >
          <Calendar className="h-3.5 w-3.5" />
          Disponibilidad
        </Button>
      </div>

      {/* Carrusel últimos partners */}
      <RecentPartnersStrip onPick={(p) => handleInvite(p)} />

      <Tabs value={mainTab} onValueChange={setMainTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="sugeridos" className="text-xs">
            <Sparkles className="mr-1 h-3 w-3" /> Sugeridos
          </TabsTrigger>
          <TabsTrigger value="reto" className="text-xs">
            Reto abierto
          </TabsTrigger>
          <TabsTrigger value="invitaciones" className="text-xs">
            Invitaciones
            {pendingReceived + pendingSent > 0 && (
              <Badge className="ml-1 h-4 px-1 text-[9px]">{pendingReceived + pendingSent}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* SUGERIDOS — máquina de estados */}
        <TabsContent value="sugeridos" className="mt-3">
          {phase === "filters" && (
            <PartnerSearchFiltersCard
              myLevel={rating?.level != null ? Number(rating.level) : null}
              filters={filters}
              setFilters={setFilters}
              candidateCount={
                suggestions.filter(
                  (s) =>
                    s.level_diff == null || Math.abs(s.level_diff) <= filters.level_delta + 0.01,
                ).length
              }
              loading={sugLoading}
              onStart={startSearch}
              onEditAvailability={() => setShowOnboarding(true)}
            />
          )}

          {phase === "swiping" && (
            <>
              {sugLoading ? (
                <Skeleton className="mx-auto h-[520px] w-full max-w-md rounded-3xl" />
              ) : (
                <PartnerSwipeStack
                  suggestions={filteredSuggestions}
                  onInvite={(p) => handleInvite(p)}
                  onSkip={(p) => setSkipped((prev) => new Set(prev).add(p.user_id))}
                  onBackToFilters={() => setPhase("filters")}
                />
              )}
            </>
          )}

          {phase === "empty" && (
            <EmptyState
              icon={Search}
              title="Ya viste a todos por hoy"
              description={`Has revisado los ${suggestions.length} jugadores compatibles con tus filtros actuales. Vuelve mañana o relaja los criterios.`}
              action={{
                label: `Relajar filtros (UTR ±${(filters.level_delta + 0.5).toFixed(1)})`,
                onClick: () => {
                  setFilters({ level_delta: Math.min(2, filters.level_delta + 0.5) });
                  setSkipped(new Set());
                  setPhase("filters");
                },
              }}
            />
          )}

          {(phase === "swiping" || phase === "empty") && (
            <Button
              variant="outline"
              className="mt-4 w-full"
              onClick={() => setShowOpenComposer(true)}
            >
              <Plus className="mr-1 h-4 w-4" />
              Publicar reto abierto
            </Button>
          )}
        </TabsContent>

        {/* RETO ABIERTO */}
        <TabsContent value="reto" className="mt-3 space-y-2">
          <Button
            variant="clay"
            className="w-full"
            onClick={() => setShowOpenComposer(true)}
          >
            <Plus className="mr-1 h-4 w-4" />
            Publicar mi reto abierto (48h)
          </Button>

          <p className="px-1 pt-1 text-[10px] text-muted-foreground">
            Ordenados por mayor coincidencia con tu disponibilidad horaria.
          </p>

          {postsLoading ? (
            Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-2xl" />
            ))
          ) : posts.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="Aún no hay retos abiertos"
              description="Publica el tuyo y el club verá tu disponibilidad por 48 horas."
            />
          ) : (
            posts.map((p) => (
              <OpenChallengeCard
                key={p.id}
                post={p}
                overlapCount={p.overlap_count ?? 0}
                isOwn={p.user_id === currentUserId}
                onInvite={() => p.author && handleInvite({ user_id: p.user_id, ...p.author })}
                onCancel={() => cancelOwnPost(p.id)}
              />
            ))
          )}
        </TabsContent>

        {/* INVITACIONES */}
        <TabsContent value="invitaciones" className="mt-3 space-y-3">
          {received.length === 0 && sent.length === 0 ? (
            <EmptyState
              icon={Send}
              title="Sin invitaciones"
              description="Cuando envíes o recibas una invitación, aparecerá aquí."
            />
          ) : (
            <Tabs defaultValue="recibidas">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="recibidas" className="text-xs">
                  Recibidas
                  {pendingReceived > 0 && (
                    <Badge className="ml-1 h-4 px-1 text-[9px]">{pendingReceived}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="enviadas" className="text-xs">
                  Enviadas
                  {pendingSent > 0 && (
                    <Badge className="ml-1 h-4 px-1 text-[9px]">{pendingSent}</Badge>
                  )}
                </TabsTrigger>
              </TabsList>
              <TabsContent value="recibidas" className="mt-3 space-y-2">
                {received.length === 0 ? (
                  <EmptyState icon={Inbox} title="Sin invitaciones recibidas" description="" />
                ) : (
                  received.map((i) => (
                    <InvitationItem key={i.id} invitation={i} side="received" onChanged={refreshInv} />
                  ))
                )}
              </TabsContent>
              <TabsContent value="enviadas" className="mt-3 space-y-2">
                {sent.length === 0 ? (
                  <EmptyState icon={Send} title="Sin invitaciones enviadas" description="" />
                ) : (
                  sent.map((i) => (
                    <InvitationItem key={i.id} invitation={i} side="sent" onChanged={refreshInv} />
                  ))
                )}
              </TabsContent>
            </Tabs>
          )}
        </TabsContent>
      </Tabs>

      <PartnerOnboardingSheet
        open={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        onSaved={() => {
          refreshAvail();
          refreshSug();
        }}
      />
      <OpenChallengeComposer
        open={showOpenComposer}
        onClose={() => setShowOpenComposer(false)}
        onSuccess={refreshPosts}
      />
      <InvitePartnerDialog
        open={!!invitePartner}
        partner={invitePartner}
        onClose={() => setInvitePartner(null)}
        onSuccess={({ partner }) => {
          setMatchSent({ partner });
          refreshSug();
          refreshInv();
        }}
      />
      <MatchSentDialog
        open={!!matchSent}
        onClose={() => setMatchSent(null)}
        partner={matchSent?.partner ?? null}
        me={
          profile
            ? {
                first_name: profile.first_name,
                last_name: profile.last_name,
                avatar_url: profile.avatar_url,
              }
            : null
        }
        compatScore={matchSent?.score ?? null}
        onKeepBrowsing={() => setPhase("swiping")}
      />
    </div>
  );
};
