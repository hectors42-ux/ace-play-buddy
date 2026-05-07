import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Trophy,
  Loader2,
  Swords,
  Crown,
  LogIn,
  Search,
  Download,
  Info,
  ChevronDown,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/providers/AuthProvider";
import { BottomNav } from "@/components/BottomNav";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EmptyState } from "@/components/EmptyState";
import { NotificationCenter } from "@/components/NotificationCenter";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { PlayerDetailDrawer } from "@/components/ladder/PlayerDetailDrawer";
import { PlayerProfileDrawer } from "@/components/profile/PlayerProfileDrawer";
import { exportLadderToPng } from "@/lib/ladder-export";
import { toast } from "@/hooks/use-toast";
import { useLadderData, type PositionRow } from "@/hooks/useLadderData";
import { isReachable } from "@/lib/ladder-utils";
import { ChallengeWithSlotsDialog } from "@/components/ladder/ChallengeWithSlotsDialog";
import { MyChallengesList } from "@/components/ladder/MyChallengesList";
import { PendingChallengesList } from "@/components/ladder/PendingChallengesList";
import { HistoryList } from "@/components/ladder/HistoryList";
import { SuggestedRivalCard } from "@/components/ladder/SuggestedRivalCard";
import { MatchupOfTheWeekCard } from "@/components/ladder/MatchupOfTheWeekCard";
import { ChallengeStreakBadge } from "@/components/ladder/ChallengeStreakBadge";
import { useChallengeablePlayers } from "@/hooks/useChallengeablePlayers";
import { useSuggestedMatchup } from "@/hooks/useSuggestedMatchup";
import { useChallengeStreak } from "@/hooks/useChallengeStreak";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { PartnerSearchView } from "@/components/partner/PartnerSearchView";

import { useClubRanking, type RankingSport } from "@/hooks/useClubRanking";
import { RankingPodium } from "@/components/ranking/RankingPodium";
import { RankingList } from "@/components/ranking/RankingList";

const initials = (first: string, last: string) =>
  `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase();

const Ranking = () => {
  const { user, isAdmin } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get("tab");
  const validTab = (t: string | null): "buscar" | "piramide" | "ranking" =>
    t === "piramide" || t === "ranking" ? t : "buscar";
  const initialTab = validTab(rawTab);
  const [tab, setTab] = useState<"buscar" | "piramide" | "ranking">(initialTab);
  const [sport, setSport] = useState<RankingSport>("tenis_singles");
  const [categoryFilter, setCategoryFilter] = useState<"all" | "A" | "B" | "C">("all");
  const [showCalibrating, setShowCalibrating] = useState(false);
  const myChallengesRef = useRef<HTMLDivElement>(null);
  const retablesMode = searchParams.get("filter") === "retables" && initialTab === "piramide";

  const { rows: rankingRows, loading: rankingLoading } = useClubRanking(sport);

  // Separar consolidados (rel >= 30) y en calibración (rel < 30)
  const { consolidated, calibrating } = useMemo(() => {
    const cons: typeof rankingRows = [];
    const cal: typeof rankingRows = [];
    for (const r of rankingRows) {
      if (categoryFilter !== "all" && r.category !== categoryFilter) continue;
      if (r.reliability >= 30) cons.push(r);
      else cal.push(r);
    }
    // Re-numerar posiciones consolidadas dentro del filtro
    cons.forEach((r, idx) => (r.rank_position = idx + 1));
    return { consolidated: cons, calibrating: cal };
  }, [rankingRows, categoryFilter]);

  const top3 = consolidated.slice(0, 3);
  const rest = consolidated.slice(3);

  // ---- Estado heredado del Ladder (sin tocar) ----
  const {
    loading,
    ladders,
    selectedLadder,
    positions,
    challenges,
    history,
    profilesById,
    myPosition,
    setSelectedLadderId,
    refresh,
  } = useLadderData();

  const [challengeTarget, setChallengeTarget] = useState<PositionRow | null>(null);
  const [detailTarget, setDetailTarget] = useState<PositionRow | null>(null);
  const [rankingDetailUserId, setRankingDetailUserId] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [search, setSearch] = useState("");
  const [exporting, setExporting] = useState(false);
  const pyramidRef = useRef<HTMLUListElement | null>(null);

  // Hooks de "Buscar partner" / Retables
  const { rows: suggestedRivals, loading: rivalsLoading, refresh: refreshRivals } =
    useChallengeablePlayers(selectedLadder?.id ?? null);
  const { matchup } = useSuggestedMatchup();
  const { current_streak, longest_streak } = useChallengeStreak();

  // Si llega ?focus=challenges en pirámide, hace scroll a Mis desafíos
  useEffect(() => {
    if (tab !== "piramide") return;
    if (searchParams.get("focus") !== "challenges") return;
    const t = setTimeout(() => {
      myChallengesRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 250);
    return () => clearTimeout(t);
  }, [tab, searchParams]);

  const filteredPositions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return positions;
    return positions.filter((p) => {
      const profile = profilesById[p.user_id];
      const name = profile
        ? `${profile.first_name} ${profile.last_name}`.toLowerCase()
        : "";
      return name.includes(q) || `#${p.position}`.includes(q);
    });
  }, [positions, profilesById, search]);

  const lastPlayedByOpponent = useMemo(() => {
    const map: Record<string, string> = {};
    if (!user) return map;
    for (const c of challenges) {
      if (!c.played_at) continue;
      const opponentId =
        c.challenger_user_id === user.id
          ? c.challenged_user_id
          : c.challenged_user_id === user.id
            ? c.challenger_user_id
            : null;
      if (!opponentId) continue;
      const prev = map[opponentId];
      if (!prev || prev < c.played_at) map[opponentId] = c.played_at;
    }
    return map;
  }, [challenges, user]);

  const handleJoin = async () => {
    if (!selectedLadder) return;
    setJoining(true);
    const { error } = await supabase.rpc("join_ladder", {
      _ladder_id: selectedLadder.id,
    });
    setJoining(false);
    if (error) {
      toast({ title: "No pudiste unirte", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "¡Te uniste a la pirámide!" });
    void refresh();
  };

  const handleExport = async () => {
    if (!pyramidRef.current || !selectedLadder) return;
    setExporting(true);
    try {
      const filename = `piramide-${selectedLadder.name.replace(/\s+/g, "-").toLowerCase()}.png`;
      await exportLadderToPng(pyramidRef.current, filename);
      toast({ title: "Pirámide exportada", description: "Imagen descargada." });
    } catch (err) {
      console.error(err);
      toast({ title: "No se pudo exportar", description: "Inténtalo de nuevo.", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-warm pb-28">
      <header className="safe-top sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-md items-center gap-3 px-5 pb-3 pt-3">
          <Link
            to="/"
            className="flex h-9 w-9 items-center justify-center rounded-2xl border border-border bg-card text-muted-foreground hover:text-foreground"
            aria-label="Volver"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex-1">
            <h1 className="font-display text-xl font-semibold">Competir</h1>
            <p className="text-xs text-muted-foreground">Tu nivel y comunidad del club</p>
          </div>
          <div className="flex items-center gap-1.5">
            <NotificationCenter />
            {isAdmin && (
              <Link
                to="/admin/ladder"
                className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-muted"
              >
                Admin
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-md px-5 pt-4">
        <Tabs
          value={tab}
          onValueChange={(v) => {
            const next = v as "buscar" | "piramide" | "ranking";
            setTab(next);
            const params = new URLSearchParams(searchParams);
            if (next === "buscar") params.delete("tab");
            else params.set("tab", next);
            params.delete("focus");
            setSearchParams(params, { replace: true });
          }}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="buscar" className="text-xs">
              Buscar
            </TabsTrigger>
            <TabsTrigger value="piramide" className="text-xs">
              Pirámide
            </TabsTrigger>
            <TabsTrigger value="ranking" className="text-xs">
              Ranking
            </TabsTrigger>
          </TabsList>

          {/* ============== BUSCAR TAB (Partner matchmaking) ============== */}
          <TabsContent value="buscar" className="mt-4 space-y-3">
            <PartnerSearchView />
          </TabsContent>

          {/* ============== RANKING TAB ============== */}
          <TabsContent value="ranking" className="mt-4 space-y-3">
            {/* Toggle Singles / Dobles */}
            <div className="flex gap-1.5 rounded-2xl border border-border bg-card p-1">
              {(["tenis_singles", "tenis_dobles"] as RankingSport[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSport(s)}
                  className={cn(
                    "flex-1 rounded-xl px-3 py-2 text-xs font-medium transition-smooth",
                    sport === s
                      ? "bg-primary text-primary-foreground shadow-clay"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {s === "tenis_singles" ? "Singles" : "Dobles"}
                </button>
              ))}
            </div>

            {/* Filtro categoría */}
            <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
              {(["all", "A", "B", "C"] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategoryFilter(c)}
                  className={cn(
                    "shrink-0 rounded-full border px-3 py-1 text-[11px] font-medium transition-smooth",
                    categoryFilter === c
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-muted-foreground hover:text-foreground",
                  )}
                >
                  {c === "all" ? "Todas" : `Cat. ${c}`}
                </button>
              ))}
            </div>

            {rankingLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-32 w-full rounded-3xl" />
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-2xl" />
                ))}
              </div>
            ) : consolidated.length === 0 && calibrating.length === 0 ? (
              <EmptyState
                icon={Trophy}
                title="Sin jugadores en el ranking"
                description={
                  sport === "tenis_dobles"
                    ? "Aún no hay partidos de dobles registrados."
                    : "Juega tu primer partido oficial para aparecer."
                }
              />
            ) : (
              <>
                {top3.length > 0 && <RankingPodium top3={top3} currentUserId={user?.id} onSelect={setRankingDetailUserId} />}
                {rest.length > 0 && <RankingList rows={rest} currentUserId={user?.id} onSelect={setRankingDetailUserId} />}

                {/* En calibración */}
                {calibrating.length > 0 && (
                  <div className="rounded-2xl border border-dashed border-border bg-card/50">
                    <button
                      type="button"
                      onClick={() => setShowCalibrating((v) => !v)}
                      className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
                      aria-expanded={showCalibrating}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm">🌱</span>
                        <div>
                          <p className="text-xs font-semibold">En calibración</p>
                          <p className="text-[10px] text-muted-foreground">
                            {calibrating.length} {calibrating.length === 1 ? "jugador" : "jugadores"} aún consolidando su nivel
                          </p>
                        </div>
                      </div>
                      <ChevronDown
                        className={cn("h-4 w-4 transition-transform", showCalibrating && "rotate-180")}
                      />
                    </button>
                    {showCalibrating && (
                      <div className="px-3 pb-3">
                        <RankingList rows={calibrating} currentUserId={user?.id} onSelect={setRankingDetailUserId} />
                      </div>
                    )}
                  </div>
                )}

                <p className="flex items-start gap-1.5 px-1 pt-1 text-[10px] text-muted-foreground">
                  <Info className="mt-0.5 h-3 w-3 shrink-0" />
                  Ranking calculado por nivel actual (estilo UTR). Las flechas ▲▼ comparan vs hace 7 días.
                </p>
              </>
            )}
          </TabsContent>

          {/* ============== PIRÁMIDE TAB (lógica heredada del Ladder) ============== */}
          <TabsContent value="piramide" className="mt-4 space-y-3">
            {ladders.length > 1 && (
              <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
                {ladders.map((l) => {
                  const active = selectedLadder?.id === l.id;
                  return (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => setSelectedLadderId(l.id)}
                      className={cn(
                        "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-smooth",
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {l.name}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="flex items-start gap-2 rounded-2xl border border-accent/30 bg-accent/5 p-3 text-[11px] text-muted-foreground">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
              <span>
                La pirámide es el modo social de retos. Los resultados también suman a tu rating del ranking.
              </span>
            </div>

            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full rounded-2xl" />
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-2xl" />
                ))}
              </div>
            ) : !selectedLadder ? (
              <EmptyState
                icon={Trophy}
                title="Sin pirámides activas"
                description="El club aún no ha creado una pirámide. Vuelve pronto."
              />
            ) : (
              <>
                {!myPosition && user && (
                  <div className="flex items-center justify-between gap-3 rounded-3xl border border-primary/30 bg-primary/5 p-4">
                    <div>
                      <p className="font-display text-sm font-semibold">
                        Aún no estás en la pirámide
                      </p>
                      <p className="text-xs text-muted-foreground">Únete y empieza a desafiar.</p>
                    </div>
                    <Button variant="clay" size="sm" onClick={handleJoin} disabled={joining}>
                      {joining ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <LogIn className="h-4 w-4" /> Unirme
                        </>
                      )}
                    </Button>
                  </div>
                )}

                {positions.length === 0 ? (
                  <EmptyState
                    icon={Trophy}
                    title="Pirámide vacía"
                    description="Sé el primero en unirte."
                  />
                ) : (
                  <>
                    {/* 1) Por responder (desafíos donde soy el desafiado) */}
                    {myPosition && (
                      <PendingChallengesList
                        challenges={challenges}
                        profilesById={profilesById}
                        onChange={refresh}
                      />
                    )}

                    {/* 2) Mis desafíos activos (compacto) */}
                    {myPosition && (
                      <div ref={myChallengesRef} className="space-y-2">
                        <h3 className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Mis desafíos activos
                        </h3>
                        <MyChallengesList
                          challenges={challenges}
                          profilesById={profilesById}
                          ladder={selectedLadder}
                          onChange={refresh}
                        />
                      </div>
                    )}

                    {/* 3) Rivales desafiables (lista de pirámide) */}
                    <div className="space-y-2 pt-1">
                      <h3 className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Rivales desafiables
                      </h3>
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Buscar jugador o #posición"
                            className="h-10 rounded-2xl pl-9"
                          />
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleExport}
                          disabled={exporting}
                          className="h-10 shrink-0"
                        >
                          {exporting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Download className="h-4 w-4" />
                              <span className="hidden sm:inline">Exportar</span>
                            </>
                          )}
                        </Button>
                      </div>

                      {filteredPositions.length === 0 ? (
                        <p className="rounded-2xl border border-dashed border-border bg-card/50 p-6 text-center text-xs text-muted-foreground">
                          Sin coincidencias para "{search}".
                        </p>
                      ) : (
                        <ul ref={pyramidRef} className="space-y-2">
                          {filteredPositions.map((p) => {
                            const profile = profilesById[p.user_id];
                            const isMe = user?.id === p.user_id;
                            const reachable =
                              !!myPosition &&
                              !isMe &&
                              isReachable(myPosition.position, p.position, selectedLadder.max_position_jump);
                            return (
                              <li key={p.id}>
                                <button
                                  type="button"
                                  onClick={() => setDetailTarget(p)}
                                  className={cn(
                                    "flex w-full items-center gap-3 rounded-2xl border bg-card p-3 text-left transition-smooth hover:-translate-y-0.5",
                                    isMe
                                      ? "border-primary bg-primary/5 shadow-clay"
                                      : reachable
                                        ? "border-accent/40 shadow-card"
                                        : "border-border shadow-card",
                                  )}
                                >
                                  <div
                                    className={cn(
                                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl font-display text-sm font-bold",
                                      p.position === 1
                                        ? "bg-gradient-clay text-primary-foreground shadow-clay"
                                        : isMe
                                          ? "bg-primary text-primary-foreground"
                                          : "bg-muted text-foreground",
                                    )}
                                  >
                                    {p.position === 1 ? <Crown className="h-5 w-5" /> : `#${p.position}`}
                                  </div>
                                  <Avatar className="h-9 w-9">
                                    <AvatarImage src={profile?.avatar_url ?? undefined} />
                                    <AvatarFallback className="text-[11px]">
                                      {profile ? initials(profile.first_name, profile.last_name) : "?"}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium">
                                      {profile ? `${profile.first_name} ${profile.last_name}` : "Jugador"}
                                      {isMe && (
                                        <span className="ml-1 text-[10px] font-semibold uppercase tracking-wider text-primary">
                                          Tú
                                        </span>
                                      )}
                                    </p>
                                    <p className="text-[11px] text-muted-foreground">
                                      {p.wins}V · {p.losses}D
                                      {p.status !== "activo" && (
                                        <span className="ml-1 text-warning">· {p.status}</span>
                                      )}
                                    </p>
                                  </div>
                                  {reachable && (
                                    <span
                                      role="button"
                                      tabIndex={0}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setChallengeTarget(p);
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter" || e.key === " ") {
                                          e.stopPropagation();
                                          e.preventDefault();
                                          setChallengeTarget(p);
                                        }
                                      }}
                                      className="inline-flex shrink-0 items-center gap-1 rounded-md border border-input bg-background px-2.5 py-1.5 text-xs font-medium hover:bg-muted"
                                    >
                                      <Swords className="h-3.5 w-3.5" /> Desafiar
                                    </span>
                                  )}
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      )}

                      {myPosition && (
                        <p className="text-center text-[11px] text-muted-foreground">
                          Puedes desafiar hasta {selectedLadder.max_position_jump} posicion
                          {selectedLadder.max_position_jump === 1 ? "" : "es"} por encima.
                        </p>
                      )}
                    </div>

                    {/* 4) Historial */}
                    {myPosition && (
                      <div className="space-y-2 pt-2">
                        <h3 className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Historial
                        </h3>
                        <HistoryList history={history} profilesById={profilesById} />
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </TabsContent>

        </Tabs>
      </main>

      {challengeTarget && myPosition && selectedLadder && (
        <ChallengeWithSlotsDialog
          open={!!challengeTarget}
          onOpenChange={(open) => !open && setChallengeTarget(null)}
          ladder={selectedLadder}
          myPosition={myPosition}
          target={challengeTarget}
          targetName={
            profilesById[challengeTarget.user_id]
              ? `${profilesById[challengeTarget.user_id].first_name} ${profilesById[challengeTarget.user_id].last_name}`
              : "este jugador"
          }
          lastPlayedBetween={lastPlayedByOpponent[challengeTarget.user_id] ?? null}
          onCreated={() => {
            void refresh();
            void refreshRivals();
          }}
        />
      )}

      <PlayerDetailDrawer
        open={!!detailTarget}
        onOpenChange={(open) => !open && setDetailTarget(null)}
        position={detailTarget}
        profile={detailTarget ? profilesById[detailTarget.user_id] ?? null : null}
        isMe={!!detailTarget && user?.id === detailTarget.user_id}
        reachable={
          !!detailTarget &&
          !!myPosition &&
          user?.id !== detailTarget.user_id &&
          !!selectedLadder &&
          isReachable(myPosition.position, detailTarget.position, selectedLadder.max_position_jump)
        }
        onChallenge={() => detailTarget && setChallengeTarget(detailTarget)}
      />

      <PlayerProfileDrawer
        open={!!rankingDetailUserId}
        onOpenChange={(open) => !open && setRankingDetailUserId(null)}
        userId={rankingDetailUserId}
        sport={sport}
      />

      <BottomNav />
    </div>
  );
};

export default Ranking;
