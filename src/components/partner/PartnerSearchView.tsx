import { useState, useMemo, useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { Sparkles, CalendarPlus, Inbox, Send } from "lucide-react";
import { useUserAvailability } from "@/hooks/useUserAvailability";
import { usePartnerSuggestions, type PartnerSuggestion } from "@/hooks/usePartnerSuggestions";
import { useMatchInvitations } from "@/hooks/useMatchInvitations";
import { useMatchOpenPosts } from "@/hooks/useMatchOpenPosts";
import { RecentPartnersStrip } from "./RecentPartnersStrip";
import { PartnerCard } from "./PartnerCard";
import { PartnerOnboardingSheet } from "./PartnerOnboardingSheet";
import { InvitePartnerDialog } from "./InvitePartnerDialog";
import { InvitationItem } from "./InvitationItem";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const initials = (a?: string | null, b?: string | null) =>
  `${a?.[0] ?? ""}${b?.[0] ?? ""}`.toUpperCase() || "?";

const formatSlot = (iso: string) =>
  new Date(iso).toLocaleString("es-CL", {
    weekday: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export const PartnerSearchView = () => {
  const { hasAvailability, loading: availLoading } = useUserAvailability();
  const { rows: suggestions, loading: sugLoading, refresh: refreshSug } = usePartnerSuggestions(12);
  const { received, sent, refresh: refreshInv } = useMatchInvitations();
  const { posts, loading: postsLoading, currentUserId } = useMatchOpenPosts();

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [invitePartner, setInvitePartner] = useState<{
    user_id: string;
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
  } | null>(null);
  const [skipped, setSkipped] = useState<Set<string>>(new Set());

  // Reiniciar la lista de "saltados" automáticamente al abrir la vista
  useEffect(() => {
    setSkipped(new Set());
    refreshSug();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetSuggestions = () => {
    setSkipped(new Set());
    refreshSug();
  };

  const visibleSuggestions = useMemo(
    () => suggestions.filter((s) => !skipped.has(s.user_id)),
    [suggestions, skipped],
  );

  const pendingReceived = received.filter((i) => i.status === "pending").length;
  const pendingSent = sent.filter((i) => i.status === "pending").length;

  const needsOnboarding = !availLoading && !hasAvailability;

  if (needsOnboarding && !showOnboarding) {
    return (
      <>
        <EmptyState
          icon={CalendarPlus}
          title="Antes de buscar partner"
          description="Cuéntanos cuándo sueles poder jugar para sugerirte socios compatibles."
          action={{
            label: "Configurar disponibilidad",
            onClick: () => setShowOnboarding(true),
          }}
        />
        <PartnerOnboardingSheet open={showOnboarding} onClose={() => setShowOnboarding(false)} />
      </>
    );
  }

  const handleInvite = (p: PartnerSuggestion | { user_id: string; first_name: string | null; last_name: string | null; avatar_url: string | null }) => {
    setInvitePartner({
      user_id: p.user_id,
      first_name: p.first_name,
      last_name: p.last_name,
      avatar_url: p.avatar_url,
    });
  };

  return (
    <div className="space-y-4">
      <div className="px-1">
        <h2 className="font-display text-2xl font-semibold tracking-tight">
          Encuentra tu Partner
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Te sugerimos socios compatibles para un partido casual.
        </p>
      </div>

      {/* Carrusel últimos partners */}
      <RecentPartnersStrip onPick={handleInvite} />

      <Tabs defaultValue="sugeridos" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="sugeridos" className="text-xs">
            <Sparkles className="mr-1 h-3 w-3" /> Sugeridos
          </TabsTrigger>
          <TabsTrigger value="bolsa" className="text-xs">
            Bolsa
          </TabsTrigger>
          <TabsTrigger value="invitaciones" className="text-xs">
            Invitaciones
            {pendingReceived + pendingSent > 0 && (
              <Badge className="ml-1 h-4 px-1 text-[9px]">{pendingReceived + pendingSent}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* SUGERIDOS */}
        <TabsContent value="sugeridos" className="mt-3 space-y-2">
          {sugLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-2xl" />
            ))
          ) : visibleSuggestions.length === 0 ? (
            <EmptyState
              icon={Sparkles}
              title="Ya viste a todos por hoy"
              description="Relaja tus filtros, recarga las sugerencias o publica en la Bolsa para que te encuentren."
              action={{ label: "Recargar sugerencias", onClick: resetSuggestions }}
            />
          ) : (
            <>
              {skipped.size > 0 && (
                <div className="flex justify-end px-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-muted-foreground"
                    onClick={resetSuggestions}
                  >
                    <RefreshCw className="mr-1 h-3 w-3" />
                    Reiniciar lista ({skipped.size} saltados)
                  </Button>
                </div>
              )}
              {visibleSuggestions.map((s) => (
                <PartnerCard
                  key={s.user_id}
                  partner={s}
                  onSkip={() => setSkipped((prev) => new Set(prev).add(s.user_id))}
                  onInvite={() => handleInvite(s)}
                />
              ))}
            </>
          )}
        </TabsContent>

        {/* BOLSA */}
        <TabsContent value="bolsa" className="mt-3 space-y-2">
          {postsLoading ? (
            Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-2xl" />
            ))
          ) : posts.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="Bolsa vacía"
              description="Aún nadie ha publicado un Busco Partner. Sé el primero."
            />
          ) : (
            posts.map((p) => (
              <div key={p.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={p.author?.avatar_url ?? undefined} />
                    <AvatarFallback>
                      {initials(p.author?.first_name, p.author?.last_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-sm font-semibold">
                      {p.author?.first_name} {p.author?.last_name}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Formato: {p.format === "1set" ? "1 set" : p.format === "best_of_3" ? "Mejor de 3" : "Mejor de 5"}
                    </p>
                  </div>
                </div>
                {p.note && <p className="mt-2 text-xs text-muted-foreground">"{p.note}"</p>}
                {Array.isArray(p.available_slots) && p.available_slots.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {p.available_slots.slice(0, 4).map((s, i) => (
                      <Badge key={i} variant="outline" className="text-[10px]">
                        {formatSlot(s.starts_at)}
                      </Badge>
                    ))}
                  </div>
                )}
                {p.user_id !== currentUserId && (
                  <Button
                    variant="clay"
                    size="sm"
                    className="mt-3 w-full"
                    onClick={() => p.author && handleInvite({ user_id: p.user_id, ...p.author })}
                  >
                    Invitar a jugar
                  </Button>
                )}
              </div>
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
            <>
              {received.length > 0 && (
                <section className="space-y-2">
                  <p className="px-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Recibidas
                    {pendingReceived > 0 && (
                      <Badge className="ml-2 h-4 px-1 text-[9px]">{pendingReceived}</Badge>
                    )}
                  </p>
                  {received.map((i) => (
                    <InvitationItem key={i.id} invitation={i} side="received" onChanged={refreshInv} />
                  ))}
                </section>
              )}
              {sent.length > 0 && (
                <section className="space-y-2">
                  <p className="px-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Enviadas
                  </p>
                  {sent.map((i) => (
                    <InvitationItem key={i.id} invitation={i} side="sent" onChanged={refreshInv} />
                  ))}
                </section>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      <PartnerOnboardingSheet open={showOnboarding} onClose={() => setShowOnboarding(false)} />
      <InvitePartnerDialog
        open={!!invitePartner}
        partner={invitePartner}
        onClose={() => setInvitePartner(null)}
        onSuccess={() => {
          refreshSug();
          refreshInv();
        }}
      />
    </div>
  );
};
