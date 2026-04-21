import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  TrendingUp,
  Trophy,
  Flame,
  ArrowRight,
  Check,
  X,
  ChevronDown,
  Activity,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts";
import { useAuth } from "@/components/providers/AuthProvider";
import { useRatingHistory } from "@/hooks/useRatingHistory";
import { useUserProfileSummary } from "@/hooks/useUserProfileSummary";
import { RatingEvolutionChart } from "@/components/rating/RatingEvolutionChart";
import { formatLevel, formatDelta, getDeltaColor } from "@/lib/rating-utils";
import type { ClubRankingRow, RankingSport } from "@/hooks/useClubRanking";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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

/* ---------- Donut chart ---------- */
const DonutStat = ({
  value,
  total,
  color,
  label,
  sublabel,
}: {
  value: number;
  total: number;
  color: string;
  label: string;
  sublabel: string;
}) => {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  const data = [
    { name: "v", value: value || 0.0001 },
    { name: "r", value: Math.max(total - value, 0) },
  ];
  return (
    <div className="flex flex-col items-center gap-1.5 rounded-2xl border border-border bg-card p-3">
      <div className="relative h-20 w-20">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              innerRadius="72%"
              outerRadius="100%"
              startAngle={90}
              endAngle={-270}
              stroke="none"
              isAnimationActive={false}
            >
              <Cell fill={color} />
              <Cell fill="hsl(var(--muted))" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-base font-bold leading-none">{pct}%</span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-[11px] font-semibold leading-none">{label}</p>
        <p className="mt-0.5 text-[10px] text-muted-foreground">{sublabel}</p>
      </div>
    </div>
  );
};

/* ---------- Compact stat tile ---------- */
const MiniStat = ({
  icon: Icon,
  label,
  value,
  hint,
  accent,
}: {
  icon: typeof Trophy;
  label: string;
  value: string | number;
  hint?: string;
  accent?: string;
}) => (
  <div className="flex items-center gap-2.5 rounded-2xl border border-border bg-card p-2.5">
    <div
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
        accent ?? "bg-primary/10 text-primary",
      )}
    >
      <Icon className="h-4 w-4" />
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="font-display text-base font-bold leading-tight">{value}</p>
      {hint && <p className="truncate text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  </div>
);

/* ---------- Match row ---------- */
const MatchRow = ({
  m,
}: {
  m: {
    id: string;
    won: boolean;
    opponent_name?: string;
    source: string;
    recorded_at: string;
    delta: number;
    level_after: number;
  };
}) => {
  const Icon = m.won ? Check : X;
  return (
    <li className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-2.5 py-2">
      <div
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
          m.won ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive",
        )}
      >
        <Icon className="h-3.5 w-3.5" strokeWidth={3} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium leading-tight">
          vs {m.opponent_name ?? "Rival"}
        </p>
        <p className="text-[10px] text-muted-foreground">
          {SOURCE_LABEL[m.source] ?? m.source} ·{" "}
          {format(new Date(m.recorded_at), "d MMM", { locale: es })}
        </p>
      </div>
      <div className="flex flex-col items-end">
        <span className={cn("text-xs font-bold", getDeltaColor(m.delta))}>
          {formatDelta(m.delta)}
        </span>
        <span className="text-[10px] text-muted-foreground">
          → {formatLevel(m.level_after)}
        </span>
      </div>
    </li>
  );
};

export const MyEvolutionTab = ({ sport, ranking }: Props) => {
  const { user } = useAuth();
  const { history: allHistory, loading } = useRatingHistory(40);
  const { data: summary } = useUserProfileSummary(user?.id ?? null, sport);
  const [matchesOpen, setMatchesOpen] = useState(false);

  const history = useMemo(
    () => allHistory.filter((h) => h.sport === sport),
    [allHistory, sport],
  );

  const me = useMemo(
    () => ranking.find((r) => r.user_id === user?.id) ?? null,
    [ranking, user],
  );

  const wins = summary?.stats.wins ?? 0;
  const losses = summary?.stats.losses ?? 0;
  const totalMatches = wins + losses;

  const recent30 = useMemo(() => {
    if (!summary?.recent_matches?.length) return { wins: 0, total: 0 };
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const recent = summary.recent_matches.filter(
      (m) => new Date(m.recorded_at).getTime() >= cutoff,
    );
    return {
      wins: recent.filter((m) => m.won).length,
      total: recent.length,
    };
  }, [summary]);

  const bestLevel = useMemo(() => {
    if (history.length === 0) return null;
    return Math.max(...history.map((h) => Number(h.level_after)));
  }, [history]);

  const bestWin = useMemo(() => {
    if (!summary?.recent_matches) return null;
    const wonOnes = summary.recent_matches.filter((m) => m.won && m.delta > 0);
    if (wonOnes.length === 0) return null;
    return wonOnes.reduce((best, m) => (m.delta > best.delta ? m : best), wonOnes[0]);
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
        <p className="text-sm font-medium">
          Aún sin datos en {sport === "tenis_singles" ? "singles" : "dobles"}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Juega tu primer partido oficial para aparecer en el ranking.
        </p>
      </div>
    );
  }

  const recentMatches = summary?.recent_matches ?? [];
  const firstThree = recentMatches.slice(0, 3);
  const nextSeven = recentMatches.slice(3, 10);

  return (
    <div className="space-y-4">
      {/* Hero scorecard */}
      <div className="rounded-3xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Nivel actual
            </p>
            <p className="font-display text-3xl font-bold leading-none">
              {formatLevel(me.level)}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Categoría {me.category ?? "—"} · #{me.rank_position} del ranking
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Mejor histórico
            </p>
            <p className="font-display text-xl font-bold leading-none">
              {bestLevel ? formatLevel(bestLevel) : "—"}
            </p>
            {me.streak !== 0 && (
              <p
                className={cn(
                  "mt-1 inline-flex items-center gap-1 text-[10px] font-semibold",
                  me.streak > 0 ? "text-success" : "text-destructive",
                )}
              >
                {me.streak > 0 ? "🔥" : ""} {Math.abs(me.streak)}{" "}
                {me.streak > 0 ? "victorias" : "derrotas"} seguidas
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Donuts: % victorias total y 30d */}
      <div className="grid grid-cols-2 gap-2">
        <DonutStat
          value={wins}
          total={totalMatches}
          color="hsl(var(--success))"
          label="% Victorias total"
          sublabel={`${wins}V · ${losses}D · ${totalMatches} jugados`}
        />
        <DonutStat
          value={recent30.wins}
          total={recent30.total}
          color="hsl(var(--primary))"
          label="% Victorias 30d"
          sublabel={
            recent30.total > 0
              ? `${recent30.wins}V · ${recent30.total - recent30.wins}D`
              : "Sin partidos recientes"
          }
        />
      </div>

      {/* Mini stats */}
      <div className="grid grid-cols-2 gap-2">
        <MiniStat
          icon={Activity}
          label="Total partidos"
          value={me.matches_played}
          hint="histórico"
        />
        <MiniStat
          icon={Trophy}
          label="Posición"
          value={`#${me.rank_position}`}
          hint={
            me.prev_rank_position && me.prev_rank_position !== me.rank_position
              ? `era #${me.prev_rank_position}`
              : "estable"
          }
          accent="bg-warning/10 text-warning"
        />
      </div>

      {/* Mejor victoria */}
      {bestWin && (
        <div className="flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15">
            <Flame className="h-4 w-4 text-primary" />
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

      {/* Evolución de nivel */}
      <div>
        <h3 className="mb-2 flex items-center gap-1.5 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <TrendingUp className="h-3 w-3" />
          Evolución de nivel
        </h3>
        <RatingEvolutionChart history={history} />
      </div>

      {/* Partidos recientes — 3 visibles + colapsable hasta 10 */}
      {recentMatches.length > 0 && (
        <div className="space-y-2">
          <h3 className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Partidos recientes
          </h3>
          <ul className="space-y-1.5">
            {firstThree.map((m) => (
              <MatchRow key={m.id} m={m} />
            ))}
          </ul>

          {nextSeven.length > 0 && (
            <Collapsible open={matchesOpen} onOpenChange={setMatchesOpen}>
              <CollapsibleContent className="space-y-1.5 pt-1.5 data-[state=closed]:animate-none">
                <ul className="space-y-1.5">
                  {nextSeven.map((m) => (
                    <MatchRow key={m.id} m={m} />
                  ))}
                </ul>
              </CollapsibleContent>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-1 w-full text-xs text-muted-foreground hover:text-foreground"
                >
                  {matchesOpen
                    ? "Mostrar menos"
                    : `Ver ${nextSeven.length} partidos más`}
                  <ChevronDown
                    className={cn(
                      "ml-1 h-3.5 w-3.5 transition-transform",
                      matchesOpen && "rotate-180",
                    )}
                  />
                </Button>
              </CollapsibleTrigger>
            </Collapsible>
          )}
        </div>
      )}

      <Button asChild variant="outline" className="w-full">
        <Link to="/perfil">
          Ver mi perfil completo
          <ArrowRight className="ml-1 h-3.5 w-3.5" />
        </Link>
      </Button>
    </div>
  );
};
