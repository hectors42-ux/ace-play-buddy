import { useMemo } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { TrendingUp, Trophy, Activity, Target, Flame, ArrowRight, Check, X } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useRatingHistory } from "@/hooks/useRatingHistory";
import { useUserProfileSummary } from "@/hooks/useUserProfileSummary";
import { RatingEvolutionChart } from "@/components/rating/RatingEvolutionChart";
import { formatLevel, formatDelta, getDeltaColor } from "@/lib/rating-utils";
import type { ClubRankingRow, RankingSport } from "@/hooks/useClubRanking";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  sport: RankingSport;
  ranking: ClubRankingRow[];
}

const SOURCE_LABEL: Record<string, string> = {
  onboarding: "Test inicial",
  ladder_challenge: "Pirámide",
  match_ladder: "Pirámide",
  tournament_match: "Torneo",
  match_tournament: "Torneo",
  match_open: "Amistoso",
  clase: "Clase",
  manual_admin: "Ajuste club",
  manual_self: "Ajuste",
  decay: "Inactividad",
};

const Stat = ({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof TrendingUp;
  label: string;
  value: string | number;
  hint?: string;
}) => (
  <div className="flex flex-col gap-0.5 rounded-2xl border border-border bg-card p-3">
    <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
      <Icon className="h-3 w-3" />
      {label}
    </div>
    <p className="font-display text-xl font-bold leading-none">{value}</p>
    {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
  </div>
);

export const MyEvolutionTab = ({ sport, ranking }: Props) => {
  const { user } = useAuth();
  const { history: allHistory, loading } = useRatingHistory(40);
  const { data: summary } = useUserProfileSummary(user?.id ?? null, sport);

  const history = useMemo(
    () => allHistory.filter((h) => h.sport === sport),
    [allHistory, sport],
  );

  const me = useMemo(
    () => ranking.find((r) => r.user_id === user?.id) ?? null,
    [ranking, user],
  );

  const bestLevel = useMemo(() => {
    if (history.length === 0) return null;
    return Math.max(...history.map((h) => Number(h.level_after)));
  }, [history]);

  const winRate30d = useMemo(() => {
    if (!summary?.recent_matches?.length) return null;
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const recent = summary.recent_matches.filter(
      (m) => new Date(m.recorded_at).getTime() >= cutoff,
    );
    if (recent.length === 0) return null;
    const wins = recent.filter((m) => m.won).length;
    return { pct: Math.round((wins / recent.length) * 100), total: recent.length };
  }, [summary]);

  const winRateAll = useMemo(() => {
    if (!summary) return null;
    const total = summary.stats.wins + summary.stats.losses;
    if (total === 0) return null;
    return Math.round((summary.stats.wins / total) * 100);
  }, [summary]);

  const bestWin = useMemo(() => {
    if (!summary?.recent_matches) return null;
    const wins = summary.recent_matches.filter((m) => m.won && m.delta > 0);
    if (wins.length === 0) return null;
    return wins.reduce((best, m) => (m.delta > best.delta ? m : best), wins[0]);
  }, [summary]);

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-[180px] w-full rounded-2xl" />
      </div>
    );
  }

  if (!me) {
    return (
      <div className="rounded-3xl border border-dashed border-border bg-card/50 p-8 text-center">
        <p className="text-sm font-medium">Aún sin datos en {sport === "tenis_singles" ? "singles" : "dobles"}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Juega tu primer partido oficial para aparecer en el ranking.
        </p>
      </div>
    );
  }

  const streakLabel =
    me.streak > 0
      ? `${me.streak} 🔥 victorias seguidas`
      : me.streak < 0
        ? `${Math.abs(me.streak)} derrotas seguidas`
        : "Sin racha activa";

  const recentMatches = (summary?.recent_matches ?? []).slice(0, 5);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <Stat
          icon={Trophy}
          label="Mi posición"
          value={`#${me.rank_position}`}
          hint={
            me.prev_rank_position && me.prev_rank_position !== me.rank_position
              ? `era #${me.prev_rank_position} hace 7 días`
              : "estable esta semana"
          }
        />
        <Stat
          icon={TrendingUp}
          label="Nivel actual"
          value={formatLevel(me.level)}
          hint={`Categoría ${me.category ?? "—"}`}
        />
        <Stat
          icon={Activity}
          label="Partidos"
          value={me.matches_played}
          hint={streakLabel}
        />
        <Stat
          icon={Target}
          label="Mejor nivel"
          value={bestLevel ? formatLevel(bestLevel) : "—"}
          hint="histórico"
        />
      </div>

      {(winRate30d || winRateAll !== null || bestWin) && (
        <div className="space-y-2">
          <h3 className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Insights
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {winRate30d && (
              <Stat
                icon={Flame}
                label="% Victorias 30d"
                value={`${winRate30d.pct}%`}
                hint={`${winRate30d.total} partidos`}
              />
            )}
            {winRateAll !== null && (
              <Stat
                icon={Trophy}
                label="% Victorias total"
                value={`${winRateAll}%`}
                hint={`${summary?.stats.wins}V · ${summary?.stats.losses}D`}
              />
            )}
            {bestWin && (
              <div className="col-span-2 flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15">
                  <Trophy className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    Mejor victoria reciente
                  </p>
                  <p className="truncate text-sm font-semibold">
                    vs {bestWin.opponent_name ?? "Rival"}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {format(new Date(bestWin.recorded_at), "d MMM", { locale: es })} ·{" "}
                    {SOURCE_LABEL[bestWin.source] ?? bestWin.source}
                  </p>
                </div>
                <span className={cn("font-display text-base font-bold", getDeltaColor(bestWin.delta))}>
                  {formatDelta(bestWin.delta)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {recentMatches.length > 0 && (
        <div className="space-y-2">
          <h3 className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Partidos recientes
          </h3>
          <ul className="space-y-1.5">
            {recentMatches.map((m) => {
              const Icon = m.won ? Check : X;
              return (
                <li
                  key={m.id}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-card px-3 py-2.5"
                >
                  <div
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                      m.won
                        ? "bg-success/15 text-success"
                        : "bg-destructive/15 text-destructive",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" strokeWidth={3} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      vs {m.opponent_name ?? "Rival"}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {SOURCE_LABEL[m.source] ?? m.source} ·{" "}
                      {format(new Date(m.recorded_at), "d MMM", { locale: es })}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-0.5">
                    <span className={cn("text-xs font-semibold", getDeltaColor(m.delta))}>
                      {formatDelta(m.delta)}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      → {formatLevel(m.level_after)}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div>
        <h3 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Evolución de nivel
        </h3>
        <RatingEvolutionChart history={history} />
      </div>

      <Button asChild variant="outline" className="w-full">
        <Link to="/perfil">
          Ver mi perfil completo
          <ArrowRight className="ml-1 h-3.5 w-3.5" />
        </Link>
      </Button>
    </div>
  );
};
