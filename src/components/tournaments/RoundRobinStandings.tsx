import { Fragment, useState } from "react";
import { ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { useRoundRobinStandings } from "@/hooks/useRoundRobinStandings";
import { registrationLabel, type Player, type Registration } from "@/hooks/useCategoryData";
import type { Tables } from "@/integrations/supabase/types";

type Category = Tables<"tournament_categories">;

interface Props {
  category: Category;
  registrations: Registration[];
  players: Map<string, Player>;
  highlightUserId?: string | null;
}

export const RoundRobinStandings = ({ category, registrations, players, highlightUserId }: Props) => {
  const { data, isLoading } = useRoundRobinStandings(category.id);
  const [expanded, setExpanded] = useState<string | null>(null);

  const weights = (category.tiebreaker_weights as Record<string, number> | null) ?? {
    matches: 1,
    sets: 0.1,
    games: 0.01,
    stb: 0.001,
  };

  const opRules = ((category as { operational_rules?: Record<string, unknown> }).operational_rules ?? {}) as Record<string, unknown>;
  const bottomN = Number(opRules.bottom_n_tail ?? 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    );
  }

  // Asegurar que todos los inscritos confirmados aparezcan, aunque no hayan jugado
  const confirmed = registrations.filter((r) => r.status === "confirmada");
  const byReg = new Map((data ?? []).map((r) => [r.registration_id, r]));
  const rows = confirmed
    .map((r) => {
      const s = byReg.get(r.id);
      return {
        registration_id: r.id,
        matches_played: s?.matches_played ?? 0,
        matches_won: s?.matches_won ?? 0,
        sets_won: s?.sets_won ?? 0,
        games_won: s?.games_won ?? 0,
        stb_games_won: s?.stb_games_won ?? 0,
        total_points: s?.total_points ?? 0,
        position: s?.position ?? 99,
      };
    })
    .sort((a, b) => b.total_points - a.total_points || b.matches_won - a.matches_won);

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <table className="w-full text-xs">
        <thead className="bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-2 py-2 text-left">Pos</th>
            <th className="px-2 py-2 text-left">Jugador</th>
            <th className="px-1 py-2 text-center">PJ</th>
            <th className="px-1 py-2 text-center">PG</th>
            <th className="px-1 py-2 text-center">SG</th>
            <th className="px-1 py-2 text-center">JG</th>
            <th className="px-1 py-2 text-center">STB</th>
            <th className="px-2 py-2 text-right">Pts</th>
            <th className="w-6" />
          </tr>
        </thead>
        <tbody>
          {rows.map((r, idx) => {
            const reg = registrations.find((x) => x.id === r.registration_id);
            const label = registrationLabel(reg, players);
            const isMe = !!highlightUserId && reg && (reg.player1_user_id === highlightUserId || reg.player2_user_id === highlightUserId);
            const open = expanded === r.registration_id;
            const isTail = bottomN > 0 && idx >= rows.length - bottomN;
            return (
              <Fragment key={r.registration_id}>
                <tr
                  onClick={() => setExpanded(open ? null : r.registration_id)}
                  className={`cursor-pointer border-t border-border hover:bg-muted/30 ${isMe ? "bg-primary/5 font-medium" : ""} ${isTail ? "bg-destructive/5" : ""}`}
                >
                  <td className="px-2 py-2 font-display text-sm">{idx + 1}</td>
                  <td className="px-2 py-2">
                    {label}
                    {isTail && (
                      <span className="ml-2 rounded-full bg-destructive/10 px-1.5 py-0.5 text-[9px] font-medium text-destructive">
                        Zona de cola
                      </span>
                    )}
                  </td>
                  <td className="px-1 py-2 text-center">{r.matches_played}</td>
                  <td className="px-1 py-2 text-center">{r.matches_won}</td>
                  <td className="px-1 py-2 text-center">{r.sets_won}</td>
                  <td className="px-1 py-2 text-center">{r.games_won}</td>
                  <td className="px-1 py-2 text-center">{r.stb_games_won}</td>
                  <td className="px-2 py-2 text-right font-display">{r.total_points.toFixed(3)}</td>
                  <td className="pr-2 text-muted-foreground">
                    {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                  </td>
                </tr>
                {open && (
                  <tr className="border-t border-border bg-muted/20">
                    <td colSpan={9} className="px-3 py-2 text-[11px] text-muted-foreground">
                      <div className="space-y-0.5">
                        <Line label="Partidos ganados" value={r.matches_won} weight={weights.matches} />
                        <Line label="Sets ganados" value={r.sets_won} weight={weights.sets} />
                        <Line label="Juegos ganados" value={r.games_won} weight={weights.games} />
                        <Line label="STB games" value={r.stb_games_won} weight={weights.stb} />
                        <div className="mt-1 border-t border-border pt-1 text-right font-medium text-foreground">
                          Total: {r.total_points.toFixed(3)}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
          {rows.length === 0 && (
            <tr>
              <td colSpan={9} className="px-3 py-6 text-center text-muted-foreground">
                Aún no hay inscritos confirmados.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

const Line = ({ label, value, weight }: { label: string; value: number; weight: number }) => (
  <div className="flex justify-between">
    <span>{label}</span>
    <span className="font-mono">
      {value} × {weight} = {(value * weight).toFixed(3)}
    </span>
  </div>
);