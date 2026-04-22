import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Flame, Trophy } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useRatingHistory } from "@/hooks/useRatingHistory";
import { useUserProfileSummary } from "@/hooks/useUserProfileSummary";
import { EvolutionHeroChart } from "@/components/ranking/EvolutionHeroChart";
import { StatsBlock } from "@/components/ranking/StatsBlock";
import { RecentMatchesCarousel } from "@/components/ranking/RecentMatchesCarousel";
import { EvolutionDetailSheet } from "@/components/ranking/EvolutionDetailSheet";
import { formatLevel } from "@/lib/rating-utils";
import type { ClubRankingRow, RankingSport } from "@/hooks/useClubRanking";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { cn, formatStreakLabel } from "@/lib/utils";

interface Props {
  sport: RankingSport;
  ranking: ClubRankingRow[];
}

export const MyEvolutionTab = ({ sport, ranking }: Props) => {
  const { user, profile } = useAuth();
  const { history: allHistory, loading } = useRatingHistory(80);
  const { data: summary } = useUserProfileSummary(user?.id ?? null, sport);
  const [detailOpen, setDetailOpen] = useState(false);

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

  // "Últimos N" basado en recent_matches del summary (hasta 10)
  const recentMatches = summary?.recent_matches ?? [];
  const recentN = recentMatches.length;
  const recentWins = recentMatches.filter((m) => m.won).length;

  const meName = profile
    ? `${profile.first_name} ${profile.last_name}`.trim()
    : "Yo";
  const meAvatar = profile?.avatar_url ?? null;
  const meLevel = me?.level ?? null;

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-[260px] w-full rounded-3xl" />
        <Skeleton className="h-[180px] w-full rounded-3xl" />
        <Skeleton className="h-40 w-full rounded-3xl" />
      </div>
    );
  }

  if (!me) {
    return (
      <div className="rounded-3xl border border-dashed border-border bg-card/50 p-8 text-center">
        <Trophy className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
        <p className="text-sm font-medium">
          Aún sin datos en {sport === "tenis_singles" ? "singles" : "dobles"}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Juega tu primer partido oficial para aparecer en el ranking.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Hero compacto: nivel + posición + racha */}
      <div className="rounded-3xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Tu nivel actual
            </p>
            <p className="font-display text-3xl font-bold leading-none">
              {formatLevel(me.level)}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Categoría {me.category ?? "—"} · #{me.rank_position} del ranking
            </p>
          </div>
          {me.streak !== 0 && (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold",
                me.streak > 0
                  ? "bg-success/15 text-success"
                  : "bg-destructive/15 text-destructive",
              )}
            >
              {me.streak > 0 && <Flame className="h-3 w-3" />}
              {formatStreakLabel(me.streak)}
            </span>
          )}
        </div>
      </div>

      {/* Hero gráfica de evolución con toggle 5/10/Todos */}
      <EvolutionHeroChart history={history} onSeeDetails={() => setDetailOpen(true)} />

      {/* Bloque de estadísticas: 2x2 + donut */}
      <StatsBlock
        totalMatches={totalMatches}
        totalWins={wins}
        recentMatches={recentN}
        recentWins={recentWins}
        recentLabel={`Últimos ${recentN}`}
      />

      {/* Carrusel de últimos partidos */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Últimos partidos
          </h3>
          {recentMatches.length > 0 && (
            <span className="text-[11px] text-muted-foreground">
              {recentMatches.length} {recentMatches.length === 1 ? "partido" : "partidos"}
            </span>
          )}
        </div>
        <RecentMatchesCarousel
          matches={recentMatches}
          meName={meName}
          meAvatar={meAvatar}
          meLevel={meLevel}
        />
      </div>

      <Button asChild variant="outline" className="w-full">
        <Link to="/perfil">
          Ver mi perfil completo
          <ArrowRight className="ml-1 h-3.5 w-3.5" />
        </Link>
      </Button>

      <EvolutionDetailSheet
        open={detailOpen}
        onOpenChange={setDetailOpen}
        history={history}
      />
    </div>
  );
};
