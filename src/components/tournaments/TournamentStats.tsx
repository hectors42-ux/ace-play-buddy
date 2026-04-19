import { Trophy, Medal, Award, Calendar, Activity, Clock, Users, Zap } from "lucide-react";
import { useMemo } from "react";
import {
  playerName,
  registrationLabel,
  type Match,
  type Player,
  type Registration,
  type Category,
} from "@/hooks/useCategoryData";

interface ScoreSet {
  a: number;
  b: number;
  tb_a?: number;
  tb_b?: number;
}

interface Props {
  category: Category;
  matches: Match[];
  registrations: Registration[];
  players: Map<string, Player>;
}

function setsWonByA(score: ScoreSet[]): { a: number; b: number } {
  let a = 0;
  let b = 0;
  for (const s of score) {
    if (s.a > s.b) a++;
    else if (s.b > s.a) b++;
  }
  return { a, b };
}

function gamesTotal(score: ScoreSet[]): number {
  return score.reduce((acc, s) => acc + s.a + s.b, 0);
}

export function TournamentStats({ category, matches, registrations, players }: Props) {
  const stats = useMemo(() => {
    const playedMatches = matches.filter(
      (m) => m.status === "jugado" || m.status === "walkover",
    );

    // Ronda final = round 1
    const finalMatch = matches.find((m) => m.round === 1);
    const semifinals = matches.filter((m) => m.round === 2);

    const championRegId = finalMatch?.winner_registration_id ?? null;
    const runnerUpRegId = finalMatch
      ? finalMatch.winner_registration_id === finalMatch.registration_a_id
        ? finalMatch.registration_b_id
        : finalMatch.registration_a_id
      : null;

    const semifinalistRegIds = semifinals
      .map((m) => {
        const loser =
          m.winner_registration_id === m.registration_a_id
            ? m.registration_b_id
            : m.registration_a_id;
        return loser;
      })
      .filter(Boolean) as string[];

    // Métricas
    let totalSets = 0;
    let tieBreaks = 0;
    let totalGames = 0;
    let longestMatchLabel = "—";
    let longestMatchGames = 0;

    // Wins por registration
    const winCounts = new Map<string, number>();
    const matchCounts = new Map<string, number>();

    for (const m of playedMatches) {
      const score = (m.score as unknown as ScoreSet[] | null) ?? [];
      totalSets += score.length;
      tieBreaks += score.filter(
        (s) => (s.a === 7 && s.b === 6) || (s.b === 7 && s.a === 6),
      ).length;
      const games = gamesTotal(score);
      totalGames += games;
      if (games > longestMatchGames) {
        longestMatchGames = games;
        const ra = registrations.find((r) => r.id === m.registration_a_id);
        const rb = registrations.find((r) => r.id === m.registration_b_id);
        longestMatchLabel = `${registrationLabel(ra, players)} vs ${registrationLabel(rb, players)}`;
      }
      if (m.winner_registration_id) {
        winCounts.set(m.winner_registration_id, (winCounts.get(m.winner_registration_id) ?? 0) + 1);
      }
      if (m.registration_a_id)
        matchCounts.set(m.registration_a_id, (matchCounts.get(m.registration_a_id) ?? 0) + 1);
      if (m.registration_b_id)
        matchCounts.set(m.registration_b_id, (matchCounts.get(m.registration_b_id) ?? 0) + 1);
    }

    // Top 3 por victorias
    const topPerformers = Array.from(winCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([regId, wins]) => ({
        regId,
        wins,
        played: matchCounts.get(regId) ?? wins,
      }));

    return {
      championRegId,
      runnerUpRegId,
      semifinalistRegIds,
      totalSets,
      tieBreaks,
      totalGames,
      longestMatchLabel,
      longestMatchGames,
      topPerformers,
      playedCount: playedMatches.length,
      totalCount: matches.length,
    };
  }, [matches, registrations, players]);

  const champion = stats.championRegId
    ? registrations.find((r) => r.id === stats.championRegId)
    : null;
  const runnerUp = stats.runnerUpRegId
    ? registrations.find((r) => r.id === stats.runnerUpRegId)
    : null;
  const semifinalists = stats.semifinalistRegIds
    .map((id) => registrations.find((r) => r.id === id))
    .filter(Boolean) as Registration[];

  if (matches.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center">
        <Activity className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">
          Las estadísticas estarán disponibles cuando se genere la llave.
        </p>
      </div>
    );
  }

  const isFinished = category.status === "finalizado" && champion;

  return (
    <div className="space-y-4">
      {/* Banner campeón */}
      {isFinished && champion && (
        <div
          className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-primary via-primary to-primary-deep p-6 text-primary-foreground shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out"
        >
          <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-primary-glow/30 blur-2xl" />
          <div className="absolute -bottom-8 -left-8 h-40 w-40 rounded-full bg-primary-glow/20 blur-3xl" />
          <div className="relative">
            <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-wider opacity-90">
              <Trophy className="h-4 w-4" /> Campeón
            </div>
            <p className="font-display text-3xl font-bold leading-tight">
              {registrationLabel(champion, players)}
            </p>
            {runnerUp && (
              <p className="mt-2 text-sm opacity-90">
                Finalista: {registrationLabel(runnerUp, players)}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Podio */}
      {isFinished && (
        <div
          className="rounded-2xl border border-border bg-card p-4 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out"
          style={{ animationDelay: "120ms", animationFillMode: "both" }}
        >
          <h3 className="mb-3 flex items-center gap-2 font-display text-sm font-semibold">
            <Medal className="h-4 w-4 text-primary" /> Podio
          </h3>
          <div className="space-y-2">
            {champion && (
              <div
                className="flex items-center gap-3 rounded-xl bg-primary/10 p-3 animate-in fade-in slide-in-from-left-3 duration-400 ease-out"
                style={{ animationDelay: "200ms", animationFillMode: "both" }}
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Trophy className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                    1° lugar
                  </p>
                  <p className="truncate text-sm font-semibold">
                    {registrationLabel(champion, players)}
                  </p>
                </div>
              </div>
            )}
            {runnerUp && (
              <div
                className="flex items-center gap-3 rounded-xl bg-muted/50 p-3 animate-in fade-in slide-in-from-left-3 duration-400 ease-out"
                style={{ animationDelay: "280ms", animationFillMode: "both" }}
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-foreground">
                  <Medal className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    2° lugar
                  </p>
                  <p className="truncate text-sm font-semibold">
                    {registrationLabel(runnerUp, players)}
                  </p>
                </div>
              </div>
            )}
            {semifinalists.map((sf, idx) => (
              <div
                key={sf.id}
                className="flex items-center gap-3 rounded-xl bg-muted/30 p-3 animate-in fade-in slide-in-from-left-3 duration-400 ease-out"
                style={{ animationDelay: `${360 + idx * 80}ms`, animationFillMode: "both" }}
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted/70 text-foreground">
                  <Award className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Semifinalista
                  </p>
                  <p className="truncate text-sm">{registrationLabel(sf, players)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Métricas */}
      <div className="grid grid-cols-2 gap-2">
        <MetricCard
          icon={<Activity className="h-4 w-4" />}
          label="Partidos jugados"
          value={`${stats.playedCount}/${stats.totalCount}`}
        />
        <MetricCard
          icon={<Calendar className="h-4 w-4" />}
          label="Sets jugados"
          value={stats.totalSets.toString()}
        />
        <MetricCard
          icon={<Zap className="h-4 w-4" />}
          label="Tie-breaks"
          value={stats.tieBreaks.toString()}
        />
        <MetricCard
          icon={<Users className="h-4 w-4" />}
          label="Inscritos"
          value={registrations.filter((r) => r.status === "confirmada").length.toString()}
        />
      </div>

      {/* Partido más largo */}
      {stats.longestMatchGames > 0 && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <h3 className="mb-2 flex items-center gap-2 font-display text-sm font-semibold">
            <Clock className="h-4 w-4 text-primary" /> Partido más largo
          </h3>
          <p className="text-sm">{stats.longestMatchLabel}</p>
          <p className="mt-1 text-xs text-muted-foreground">{stats.longestMatchGames} games en total</p>
        </div>
      )}

      {/* Top performers */}
      {stats.topPerformers.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <h3 className="mb-3 flex items-center gap-2 font-display text-sm font-semibold">
            <Trophy className="h-4 w-4 text-primary" /> Mejor desempeño
          </h3>
          <div className="space-y-2">
            {stats.topPerformers.map((tp, idx) => {
              const reg = registrations.find((r) => r.id === tp.regId);
              return (
                <div key={tp.regId} className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                    {idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {registrationLabel(reg, players)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {tp.wins} {tp.wins === 1 ? "victoria" : "victorias"} en {tp.played} partidos
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <div className="mb-1 flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <span className="text-[10px] uppercase tracking-wider">{label}</span>
      </div>
      <p className="font-display text-xl font-semibold">{value}</p>
    </div>
  );
}
