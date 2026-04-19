import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Trophy, Loader2, Swords, Crown, LogIn } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/providers/AuthProvider";
import { BottomNav } from "@/components/BottomNav";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EmptyState } from "@/components/EmptyState";
import { toast } from "@/hooks/use-toast";
import { useLadderData, type PositionRow } from "@/hooks/useLadderData";
import { isReachable } from "@/lib/ladder-utils";
import { ChallengeDialog } from "@/components/ladder/ChallengeDialog";
import { MyChallengesList } from "@/components/ladder/MyChallengesList";
import { HistoryList } from "@/components/ladder/HistoryList";
import { cn } from "@/lib/utils";

const initials = (first: string, last: string) =>
  `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase();

const Ladder = () => {
  const { user, isAdmin } = useAuth();
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
  const [joining, setJoining] = useState(false);

  // Mapa user_id -> última fecha jugada vs mí (para cooldown)
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
      toast({
        title: "No pudiste unirte",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    toast({ title: "¡Te uniste a la pirámide!" });
    void refresh();
  };

  return (
    <div className="min-h-screen bg-gradient-warm pb-28">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-md items-center gap-3 px-5 py-4">
          <Link
            to="/"
            className="flex h-9 w-9 items-center justify-center rounded-2xl border border-border bg-card text-muted-foreground hover:text-foreground"
            aria-label="Volver"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex-1">
            <h1 className="font-display text-xl font-semibold">Ladder</h1>
            <p className="text-xs text-muted-foreground">Pirámide y desafíos del club</p>
          </div>
          {isAdmin && (
            <Link
              to="/admin/ladder"
              className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-muted"
            >
              Admin
            </Link>
          )}
        </div>

        {ladders.length > 1 && (
          <div className="mx-auto flex max-w-md gap-2 overflow-x-auto px-5 pb-3">
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
      </header>

      <main className="mx-auto max-w-md px-5 pt-4">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : !selectedLadder ? (
          <EmptyState
            icon={Trophy}
            title="Sin pirámides activas"
            description="El club aún no ha creado una pirámide. Vuelve pronto."
          />
        ) : (
          <Tabs defaultValue="piramide" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="piramide" className="text-xs">
                Pirámide
              </TabsTrigger>
              <TabsTrigger value="desafios" className="text-xs">
                Mis desafíos
              </TabsTrigger>
              <TabsTrigger value="historial" className="text-xs">
                Historial
              </TabsTrigger>
            </TabsList>

            <TabsContent value="piramide" className="mt-4 space-y-3">
              {!myPosition && user && (
                <div className="flex items-center justify-between gap-3 rounded-3xl border border-primary/30 bg-primary/5 p-4">
                  <div>
                    <p className="font-display text-sm font-semibold">
                      Aún no estás en la pirámide
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Únete y empieza a desafiar.
                    </p>
                  </div>
                  <Button
                    variant="clay"
                    size="sm"
                    onClick={handleJoin}
                    disabled={joining}
                  >
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
                <ul className="space-y-2">
                  {positions.map((p) => {
                    const profile = profilesById[p.user_id];
                    const isMe = user?.id === p.user_id;
                    const reachable =
                      !!myPosition &&
                      !isMe &&
                      isReachable(
                        myPosition.position,
                        p.position,
                        selectedLadder.max_position_jump,
                      );
                    return (
                      <li
                        key={p.id}
                        className={cn(
                          "flex items-center gap-3 rounded-2xl border bg-card p-3 transition-smooth",
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
                            {profile
                              ? `${profile.first_name} ${profile.last_name}`
                              : "Jugador"}
                            {isMe && (
                              <span className="ml-1 text-[10px] font-semibold uppercase tracking-wider text-primary">
                                Tú
                              </span>
                            )}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {p.wins}V · {p.losses}D
                            {p.status !== "activo" && (
                              <span className="ml-1 text-warning">
                                · {p.status}
                              </span>
                            )}
                          </p>
                        </div>
                        {reachable && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setChallengeTarget(p)}
                            className="shrink-0"
                          >
                            <Swords className="h-3.5 w-3.5" /> Desafiar
                          </Button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}

              {myPosition && (
                <p className="pt-2 text-center text-[11px] text-muted-foreground">
                  Puedes desafiar hasta {selectedLadder.max_position_jump} posicion
                  {selectedLadder.max_position_jump === 1 ? "" : "es"} por encima.
                </p>
              )}
            </TabsContent>

            <TabsContent value="desafios" className="mt-4">
              <MyChallengesList
                challenges={challenges}
                profilesById={profilesById}
                onChange={refresh}
              />
            </TabsContent>

            <TabsContent value="historial" className="mt-4">
              <HistoryList history={history} profilesById={profilesById} />
            </TabsContent>
          </Tabs>
        )}
      </main>

      {challengeTarget && myPosition && selectedLadder && (
        <ChallengeDialog
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
          onCreated={refresh}
        />
      )}

      <BottomNav />
    </div>
  );
};

export default Ladder;
