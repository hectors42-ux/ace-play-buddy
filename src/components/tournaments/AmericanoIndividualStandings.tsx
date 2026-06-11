import { Loader2 } from "lucide-react";
import { useAmericanoIndividualStandings } from "@/hooks/useAmericanoIndividualStandings";
import { playerName, type Player } from "@/hooks/useCategoryData";

interface Props {
  categoryId: string;
  players: Map<string, Player>;
  highlightUserId?: string;
}

export const AmericanoIndividualStandings = ({ categoryId, players, highlightUserId }: Props) => {
  const { rows, loading } = useAmericanoIndividualStandings(categoryId);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-6 text-center text-xs text-muted-foreground">
        Aún no hay partidos jugados. La tabla se llena al cargar resultados.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-3 py-2 text-left">#</th>
            <th className="px-3 py-2 text-left">Jugador</th>
            <th className="px-3 py-2 text-right">PJ</th>
            <th className="px-3 py-2 text-right">PG</th>
            <th className="px-3 py-2 text-right">JG</th>
            <th className="px-3 py-2 text-right">Dif</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const isMe = highlightUserId && r.user_id === highlightUserId;
            return (
              <tr
                key={r.user_id}
                className={`border-t border-border ${isMe ? "bg-primary/5 font-medium" : ""}`}
              >
                <td className="px-3 py-2 text-left text-xs text-muted-foreground">{r.position}</td>
                <td className="px-3 py-2 text-left">
                  {playerName(players.get(r.user_id), "Jugador")}
                </td>
                <td className="px-3 py-2 text-right">{r.matches_played}</td>
                <td className="px-3 py-2 text-right">{r.matches_won}</td>
                <td className="px-3 py-2 text-right font-semibold">{r.games_won}</td>
                <td className="px-3 py-2 text-right">{r.games_diff > 0 ? `+${r.games_diff}` : r.games_diff}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};