import { useState } from "react";
import { Loader2, Plus, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { useAmericanoRounds } from "@/hooks/useAmericanoRounds";
import { playerName, type Match, type Player } from "@/hooks/useCategoryData";
import { AmericanoResultDialog } from "./AmericanoResultDialog";

interface Props {
  categoryId: string;
  matches: Match[];
  players: Map<string, Player>;
  isAdmin: boolean;
  highlightUserId?: string;
  category: { config?: unknown; americano_rounds_target?: number | null } | null;
  onChanged: () => void;
}

function pairLabel(ids: string[] | null | undefined, players: Map<string, Player>): string {
  if (!ids || ids.length === 0) return "—";
  return ids.map((id) => playerName(players.get(id), "Jugador")).join(" + ");
}

export const AmericanoRoundsView = ({
  categoryId,
  matches,
  players,
  isAdmin,
  highlightUserId,
  category,
  onChanged,
}: Props) => {
  const { rounds, loading, reload } = useAmericanoRounds(categoryId);
  const [generating, setGenerating] = useState(false);
  const [resultMatch, setResultMatch] = useState<Match | null>(null);

  const americanoMatches = matches.filter(
    (m) => (m as unknown as { phase?: string | null }).phase === "americano",
  );

  const generateNext = async () => {
    const next = rounds.length + 1;
    const target = category?.americano_rounds_target ?? null;
    if (target && next > target) {
      toast({
        title: "Se alcanzó el número de rondas objetivo",
        description: `Objetivo: ${target}. Podés cerrar la competencia.`,
      });
      return;
    }
    if (!window.confirm(`¿Generar la ronda ${next}?`)) return;
    setGenerating(true);
    const { error } = await supabase.rpc("generate_americano_round" as never, {
      _category_id: categoryId,
      _round_number: next,
    } as never);
    setGenerating(false);
    if (error) {
      toast({ title: "No se pudo generar la ronda", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: `Ronda ${next} generada` });
    await reload();
    onChanged();
  };

  const closeAmericano = async () => {
    if (!window.confirm("¿Cerrar la competencia? Se marcará como finalizada.")) return;
    const { error } = await supabase.rpc("close_americano" as never, {
      _category_id: categoryId,
    } as never);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Competencia finalizada" });
    onChanged();
  };

  const lastRound = rounds[rounds.length - 1];
  const canGenerateNext = !lastRound || lastRound.status === "finalizada";

  return (
    <div className="space-y-4">
      {isAdmin && (
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={generateNext} disabled={generating || !canGenerateNext}>
            {generating ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-1 h-4 w-4" />
            )}
            Generar siguiente ronda
          </Button>
          {rounds.length > 0 && (
            <Button size="sm" variant="outline" onClick={closeAmericano}>
              <Trophy className="mr-1 h-4 w-4" />
              Cerrar competencia
            </Button>
          )}
          {category?.americano_rounds_target ? (
            <span className="text-[11px] text-muted-foreground">
              Ronda {rounds.length} de {category.americano_rounds_target}
            </span>
          ) : (
            <span className="text-[11px] text-muted-foreground">
              {rounds.length} ronda{rounds.length === 1 ? "" : "s"} generada{rounds.length === 1 ? "" : "s"}
            </span>
          )}
        </div>
      )}

      {loading && rounds.length === 0 ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : rounds.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-6 text-center text-xs text-muted-foreground">
          Aún no hay rondas. {isAdmin ? "Generá la primera para empezar." : "Esperá a que el organizador genere la primera ronda."}
        </div>
      ) : (
        rounds.map((round) => {
          const roundMatches = americanoMatches
            .filter((m) => (m as unknown as { americano_round_id?: string | null }).americano_round_id === round.id)
            .sort((a, b) => a.bracket_position - b.bracket_position);
          return (
            <section key={round.id} className="overflow-hidden rounded-2xl border border-border bg-card">
              <header className="flex items-center justify-between border-b border-border bg-muted/30 px-3 py-2">
                <p className="text-sm font-semibold">Ronda {round.round_number}</p>
                <Badge variant={round.status === "finalizada" ? "default" : "secondary"} className="text-[10px]">
                  {round.status === "finalizada" ? "Finalizada" : round.status === "en_juego" ? "En juego" : "Pendiente"}
                </Badge>
              </header>
              <div className="divide-y divide-border">
                {roundMatches.length === 0 ? (
                  <p className="px-3 py-3 text-xs text-muted-foreground">Sin mesas.</p>
                ) : (
                  roundMatches.map((m) => {
                    const sideA = (m as unknown as { side_a_user_ids?: string[] }).side_a_user_ids ?? [];
                    const sideB = (m as unknown as { side_b_user_ids?: string[] }).side_b_user_ids ?? [];
                    const winnerSide = (m as unknown as { winner_side?: string | null }).winner_side ?? null;
                    const isMine = highlightUserId && [...sideA, ...sideB].includes(highlightUserId);
                    return (
                      <div
                        key={m.id}
                        className={`flex flex-wrap items-center justify-between gap-2 px-3 py-3 text-sm ${isMine ? "bg-primary/5" : ""}`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            Mesa {m.bracket_position}
                            {isMine && " · jugás vos"}
                          </p>
                          <p className={`truncate ${winnerSide === "a" ? "font-semibold" : ""}`}>
                            {pairLabel(sideA, players)}
                          </p>
                          <p className="text-[10px] text-muted-foreground">vs</p>
                          <p className={`truncate ${winnerSide === "b" ? "font-semibold" : ""}`}>
                            {pairLabel(sideB, players)}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {m.status === "jugado" ? (
                            <Badge variant="outline" className="text-[10px]">Jugado</Badge>
                          ) : isAdmin ? (
                            <Button size="sm" variant="outline" onClick={() => setResultMatch(m)}>
                              Cargar resultado
                            </Button>
                          ) : (
                            <Badge variant="secondary" className="text-[10px]">Pendiente</Badge>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                {round.bye_user_ids?.length > 0 && (
                  <p className="px-3 py-2 text-[11px] text-muted-foreground">
                    Bye: {round.bye_user_ids.map((id) => playerName(players.get(id), "Jugador")).join(", ")}
                  </p>
                )}
              </div>
            </section>
          );
        })
      )}

      <AmericanoResultDialog
        open={!!resultMatch}
        onOpenChange={(v) => !v && setResultMatch(null)}
        match={resultMatch}
        players={players}
        category={category}
        onSubmitted={() => {
          reload();
          onChanged();
        }}
      />
    </div>
  );
};