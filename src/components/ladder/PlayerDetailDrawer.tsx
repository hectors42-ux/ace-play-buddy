import { useMemo } from "react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Crown, Swords, Trophy, X } from "lucide-react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ChallengeRow, HistoryRow, PositionRow, ProfileLite } from "@/hooks/useLadderData";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  position: PositionRow | null;
  profile: ProfileLite | null;
  isMe: boolean;
  reachable: boolean;
  challenges: ChallengeRow[];
  history: HistoryRow[];
  onChallenge: () => void;
}

const initials = (first: string, last: string) =>
  `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase();

export const PlayerDetailDrawer = ({
  open,
  onOpenChange,
  position,
  profile,
  isMe,
  reachable,
  challenges,
  history,
  onChallenge,
}: Props) => {
  const stats = useMemo(() => {
    if (!position) return null;
    const total = position.wins + position.losses;
    const winRate = total > 0 ? Math.round((position.wins / total) * 100) : 0;
    // racha desde el historial (eventos del jugador)
    const events = history
      .filter(
        (h) =>
          h.user_id === position.user_id &&
          (h.reason === "desafio_ganado" || h.reason === "desafio_perdido"),
      )
      .sort((a, b) => (b.recorded_at ?? "").localeCompare(a.recorded_at ?? ""));
    let streak = 0;
    let streakKind: "V" | "D" | null = null;
    for (const e of events) {
      const kind: "V" | "D" = e.reason === "desafio_ganado" ? "V" : "D";
      if (streakKind === null) {
        streakKind = kind;
        streak = 1;
      } else if (kind === streakKind) {
        streak += 1;
      } else {
        break;
      }
    }
    return { total, winRate, streak, streakKind };
  }, [position, history]);

  const playerChallenges = useMemo(() => {
    if (!position) return [];
    return challenges
      .filter(
        (c) =>
          c.challenger_user_id === position.user_id ||
          c.challenged_user_id === position.user_id,
      )
      .slice(0, 5);
  }, [position, challenges]);

  if (!position) return null;

  const name = profile ? `${profile.first_name} ${profile.last_name}` : "Jugador";

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <div className="mx-auto w-full max-w-md">
          <DrawerHeader className="text-left">
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl font-display text-base font-bold",
                  position.position === 1
                    ? "bg-gradient-clay text-primary-foreground shadow-clay"
                    : "bg-muted text-foreground",
                )}
              >
                {position.position === 1 ? <Crown className="h-6 w-6" /> : `#${position.position}`}
              </div>
              <Avatar className="h-14 w-14">
                <AvatarImage src={profile?.avatar_url ?? undefined} />
                <AvatarFallback>
                  {profile ? initials(profile.first_name, profile.last_name) : "?"}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <DrawerTitle className="truncate font-display text-lg">{name}</DrawerTitle>
                <DrawerDescription className="text-xs">
                  Posición #{position.position}
                  {isMe && " · Tú"}
                  {position.status !== "activo" && ` · ${position.status}`}
                </DrawerDescription>
              </div>
              <DrawerClose asChild>
                <button
                  type="button"
                  aria-label="Cerrar"
                  className="rounded-full border border-border bg-card p-1.5 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </DrawerClose>
            </div>
          </DrawerHeader>

          <div className="space-y-4 px-4 pb-2">
            {stats && (
              <div className="grid grid-cols-4 gap-2">
                <Stat label="Victorias" value={position.wins} />
                <Stat label="Derrotas" value={position.losses} />
                <Stat
                  label="% Win"
                  value={stats.total > 0 ? `${stats.winRate}%` : "—"}
                />
                <Stat
                  label="Racha"
                  value={
                    stats.streakKind && stats.streak > 0
                      ? `${stats.streak}${stats.streakKind}`
                      : "—"
                  }
                />
              </div>
            )}

            {position.walkovers_for + position.walkovers_against > 0 && (
              <p className="text-[11px] text-muted-foreground">
                Walkovers a favor {position.walkovers_for} · en contra {position.walkovers_against}
              </p>
            )}

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Últimos desafíos
              </p>
              {playerChallenges.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-border bg-card/50 p-4 text-center text-xs text-muted-foreground">
                  Sin desafíos registrados.
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {playerChallenges.map((c) => {
                    const won = c.winner_user_id === position.user_id;
                    return (
                      <li
                        key={c.id}
                        className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2 text-xs"
                      >
                        <span className="flex items-center gap-2">
                          {c.played_at ? (
                            <Trophy
                              className={cn(
                                "h-3.5 w-3.5",
                                won ? "text-success" : "text-muted-foreground",
                              )}
                            />
                          ) : (
                            <Swords className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                          <span>
                            {c.played_at
                              ? format(parseISO(c.played_at), "d MMM yyyy", { locale: es })
                              : `Desafío ${c.status}`}
                          </span>
                        </span>
                        <span className="text-muted-foreground">
                          #{c.challenger_position} vs #{c.challenged_position}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          <DrawerFooter>
            {!isMe && reachable ? (
              <Button
                variant="clay"
                onClick={() => {
                  onOpenChange(false);
                  onChallenge();
                }}
              >
                <Swords className="h-4 w-4" /> Desafiar
              </Button>
            ) : !isMe ? (
              <p className="text-center text-xs text-muted-foreground">
                Fuera de tu rango de desafío.
              </p>
            ) : null}
            <DrawerClose asChild>
              <Button variant="ghost">Cerrar</Button>
            </DrawerClose>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

const Stat = ({ label, value }: { label: string; value: number | string }) => (
  <div className="rounded-2xl border border-border bg-card p-2 text-center">
    <p className="font-display text-base font-semibold leading-none">{value}</p>
    <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
  </div>
);
