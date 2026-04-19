import { Trophy } from "lucide-react";
import { Match, Registration, Player, registrationLabel } from "@/hooks/useCategoryData";
import { roundLabel, formatScore, totalRoundsForMatches } from "@/lib/tournament-utils";
import { cn } from "@/lib/utils";

interface BracketViewProps {
  matches: Match[];
  registrations: Registration[];
  players: Map<string, Player>;
  highlightUserId?: string;
  onMatchClick?: (match: Match) => void;
}

export const BracketView = ({
  matches,
  registrations,
  players,
  highlightUserId,
  onMatchClick,
}: BracketViewProps) => {
  if (matches.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card/50 p-6 text-center text-sm text-muted-foreground">
        La llave aún no ha sido generada.
      </div>
    );
  }

  const totalRounds = totalRoundsForMatches(matches);
  const regsById = new Map(registrations.map((r) => [r.id, r]));

  // Agrupar por ronda; rondas mayores son las primeras (R1 = final)
  const byRound: Record<number, Match[]> = {};
  for (const m of matches) {
    (byRound[m.round] ||= []).push(m);
  }
  for (const r of Object.keys(byRound)) {
    byRound[Number(r)].sort((a, b) => a.bracket_position - b.bracket_position);
  }
  const rounds = Object.keys(byRound)
    .map(Number)
    .sort((a, b) => b - a); // primera ronda = mayor número

  const isUserInReg = (regId: string | null) => {
    if (!highlightUserId || !regId) return false;
    const r = regsById.get(regId);
    if (!r) return false;
    return r.player1_user_id === highlightUserId || r.player2_user_id === highlightUserId;
  };

  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex min-w-max gap-4">
        {rounds.map((r) => (
          <div key={r} className="flex flex-col gap-3" style={{ minWidth: 220 }}>
            <h4 className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {roundLabel(r, totalRounds)}
            </h4>
            <div
              className="flex flex-col"
              style={{
                gap: `${Math.max(12, 12 * 2 ** (totalRounds - r))}px`,
                paddingTop: r === totalRounds ? 0 : `${6 * 2 ** (totalRounds - r)}px`,
              }}
            >
              {byRound[r].map((m) => {
                const regA = m.registration_a_id ? regsById.get(m.registration_a_id) : undefined;
                const regB = m.registration_b_id ? regsById.get(m.registration_b_id) : undefined;
                const winnerIsA = m.winner_registration_id && m.winner_registration_id === m.registration_a_id;
                const winnerIsB = m.winner_registration_id && m.winner_registration_id === m.registration_b_id;
                const userInA = isUserInReg(m.registration_a_id);
                const userInB = isUserInReg(m.registration_b_id);
                const userInMatch = userInA || userInB;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => onMatchClick?.(m)}
                    className={cn(
                      "flex flex-col overflow-hidden rounded-2xl border bg-card text-left transition-smooth",
                      userInMatch ? "border-primary/60 ring-1 ring-primary/30" : "border-border",
                      onMatchClick && "hover:-translate-y-0.5 hover:shadow-card",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/30 px-3 py-1.5">
                      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                        Partido {m.bracket_position}
                      </span>
                      {m.status === "jugado" && (
                        <Trophy className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                      )}
                    </div>
                    <PlayerRow
                      label={registrationLabel(regA, players)}
                      isWinner={!!winnerIsA}
                      isUser={userInA}
                      isBye={!regA}
                    />
                    <div className="h-px bg-border" />
                    <PlayerRow
                      label={registrationLabel(regB, players)}
                      isWinner={!!winnerIsB}
                      isUser={userInB}
                      isBye={!regB}
                    />
                    {m.score && (
                      <div className="border-t border-border bg-background/50 px-3 py-1 text-[10px] text-muted-foreground">
                        {formatScore(m.score)}
                        {m.walkover && " · W.O."}
                        {m.retired && " · ret."}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const PlayerRow = ({
  label,
  isWinner,
  isUser,
  isBye,
}: {
  label: string;
  isWinner: boolean;
  isUser: boolean;
  isBye: boolean;
}) => (
  <div
    className={cn(
      "flex items-center gap-2 px-3 py-2 text-xs",
      isWinner && "bg-emerald-500/5",
      isBye && "italic text-muted-foreground/60",
    )}
  >
    <span
      className={cn(
        "h-1.5 w-1.5 shrink-0 rounded-full",
        isWinner ? "bg-emerald-500" : "bg-transparent",
      )}
    />
    <span
      className={cn(
        "flex-1 truncate",
        isWinner && "font-semibold",
        isUser && "text-primary",
      )}
    >
      {label}
    </span>
  </div>
);
