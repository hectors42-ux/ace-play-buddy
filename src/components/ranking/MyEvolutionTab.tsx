import { useMemo } from "react";
import { TrendingUp, Trophy, Activity, Target } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useRatingHistory } from "@/hooks/useRatingHistory";
import { RatingEvolutionChart } from "@/components/rating/RatingEvolutionChart";
import { formatLevel } from "@/lib/rating-utils";
import type { ClubRankingRow, RankingSport } from "@/hooks/useClubRanking";
import { Skeleton } from "@/components/ui/skeleton";
import type { Database } from "@/integrations/supabase/types";

interface Props {
  sport: RankingSport;
  ranking: ClubRankingRow[];
}

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
  const { history, loading } = useRatingHistory(
    sport as Database["public"]["Enums"]["rating_sport"],
  );

  const me = useMemo(
    () => ranking.find((r) => r.user_id === user?.id) ?? null,
    [ranking, user],
  );

  const bestLevel = useMemo(() => {
    if (history.length === 0) return null;
    return Math.max(...history.map((h) => Number(h.level_after)));
  }, [history]);

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

  return (
    <div className="space-y-3">
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

      <div>
        <h3 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Evolución de nivel
        </h3>
        <RatingEvolutionChart history={history} />
      </div>
    </div>
  );
};
