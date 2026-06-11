import { Fragment } from "react";
import { Loader2 } from "lucide-react";
import { useRoundRobinGroupStandings } from "@/hooks/useRoundRobinGroupStandings";
import { useTournamentGroups } from "@/hooks/useTournamentGroups";
import { registrationLabel, type Match, type Player, type Registration } from "@/hooks/useCategoryData";
import type { Tables } from "@/integrations/supabase/types";

type Category = Tables<"tournament_categories">;

interface Props {
  category: Category;
  matches: Match[];
  registrations: Registration[];
  players: Map<string, Player>;
  highlightUserId?: string | null;
  qualifiersPerGroup?: number;
}

export const GroupsView = ({ category, matches, registrations, players, highlightUserId, qualifiersPerGroup }: Props) => {
  const { groups, loading } = useTournamentGroups(category.id, matches);
  const { data: standings, isLoading: standingsLoading } = useRoundRobinGroupStandings(category.id);
  const q = qualifiersPerGroup ?? (category as { qualifiers_per_group?: number }).qualifiers_per_group ?? 2;

  if (loading || standingsLoading) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-4 text-center text-xs text-muted-foreground">
        Los grupos aún no se han generado.
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {groups.map((g) => {
        const groupStandings = (standings ?? []).filter((s) => s.group_id === g.id);
        const byReg = new Map(groupStandings.map((s) => [s.registration_id, s]));
        const rows = g.registration_ids
          .map((regId) => {
            const s = byReg.get(regId);
            return {
              registration_id: regId,
              matches_played: s?.matches_played ?? 0,
              matches_won: s?.matches_won ?? 0,
              sets_won: s?.sets_won ?? 0,
              games_won: s?.games_won ?? 0,
              total_points: s?.total_points ?? 0,
              position: s?.position ?? 99,
            };
          })
          .sort((a, b) => b.total_points - a.total_points || b.matches_won - a.matches_won);
        return (
          <div key={g.id} className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="border-b border-border bg-muted/40 px-3 py-2">
              <p className="font-display text-sm font-semibold">Grupo {g.name}</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Clasifican top {q}
              </p>
            </div>
            <table className="w-full text-xs">
              <thead className="bg-muted/20 text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-2 py-1.5 text-left">#</th>
                  <th className="px-2 py-1.5 text-left">Jugador</th>
                  <th className="px-1 py-1.5 text-center">PJ</th>
                  <th className="px-1 py-1.5 text-center">PG</th>
                  <th className="px-1 py-1.5 text-center">SG</th>
                  <th className="px-2 py-1.5 text-right">Pts</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, idx) => {
                  const reg = registrations.find((x) => x.id === r.registration_id);
                  const label = registrationLabel(reg, players);
                  const isMe = !!highlightUserId && reg && (reg.player1_user_id === highlightUserId || reg.player2_user_id === highlightUserId);
                  const qualifies = idx + 1 <= q;
                  return (
                    <Fragment key={r.registration_id}>
                      <tr className={`border-t border-border ${isMe ? "bg-primary/5 font-medium" : ""} ${qualifies ? "" : "text-muted-foreground"}`}>
                        <td className="px-2 py-1.5 font-display text-xs">
                          {idx + 1}
                          {qualifies && <span className="ml-1 text-[9px] text-primary">●</span>}
                        </td>
                        <td className="px-2 py-1.5 truncate max-w-[140px]">{label}</td>
                        <td className="px-1 py-1.5 text-center">{r.matches_played}</td>
                        <td className="px-1 py-1.5 text-center">{r.matches_won}</td>
                        <td className="px-1 py-1.5 text-center">{r.sets_won}</td>
                        <td className="px-2 py-1.5 text-right font-display">{r.total_points.toFixed(2)}</td>
                      </tr>
                    </Fragment>
                  );
                })}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-4 text-center text-muted-foreground">
                      Sin inscritos.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
};