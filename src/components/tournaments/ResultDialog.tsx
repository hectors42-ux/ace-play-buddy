import { useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import {
  Match,
  Registration,
  Player,
  registrationLabel,
} from "@/hooks/useCategoryData";
import { parseScoreInput, inferWinnerFromScore } from "@/lib/tournament-utils";

interface ResultDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  match: Match | null;
  registrations: Registration[];
  players: Map<string, Player>;
  onSubmitted: () => void;
}

type Outcome = "score" | "walkover" | "retired";

export const ResultDialog = ({
  open,
  onOpenChange,
  match,
  registrations,
  players,
  onSubmitted,
}: ResultDialogProps) => {
  const [outcome, setOutcome] = useState<Outcome>("score");
  const [scoreText, setScoreText] = useState("");
  const [winnerId, setWinnerId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!match) return null;
  const regsById = new Map(registrations.map((r) => [r.id, r]));
  const regA = match.registration_a_id ? regsById.get(match.registration_a_id) : undefined;
  const regB = match.registration_b_id ? regsById.get(match.registration_b_id) : undefined;

  const reset = () => {
    setOutcome("score");
    setScoreText("");
    setWinnerId(null);
  };

  const handleSubmit = async () => {
    if (!regA || !regB) {
      toast({ title: "Faltan jugadores en este partido", variant: "destructive" });
      return;
    }
    let parsedScore: ReturnType<typeof parseScoreInput> = null;
    let resolvedWinner = winnerId;
    let walkover = false;
    let retired = false;

    if (outcome === "score") {
      parsedScore = parseScoreInput(scoreText);
      if (!parsedScore || parsedScore.length === 0) {
        toast({
          title: "Score inválido",
          description: "Usa el formato 6-4 6-3 o 6-4 7-6(5)",
          variant: "destructive",
        });
        return;
      }
      const inferred = inferWinnerFromScore(parsedScore, regA.id, regB.id);
      if (inferred) resolvedWinner = inferred;
      if (!resolvedWinner) {
        toast({ title: "Selecciona el ganador", variant: "destructive" });
        return;
      }
    } else if (outcome === "walkover") {
      walkover = true;
      if (!resolvedWinner) {
        toast({ title: "Selecciona quién avanza por W.O.", variant: "destructive" });
        return;
      }
    } else {
      retired = true;
      parsedScore = scoreText ? parseScoreInput(scoreText) : null;
      if (!resolvedWinner) {
        toast({ title: "Selecciona el ganador", variant: "destructive" });
        return;
      }
    }

    setSubmitting(true);
    const { data, error } = await supabase.rpc("submit_match_result", {
      _match_id: match.id,
      _winner_registration_id: resolvedWinner,
      _score: parsedScore as never,
      _walkover: walkover,
      _retired: retired,
    });
    setSubmitting(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    const result = data as { status?: string } | null;
    toast({
      title:
        result?.status === "confirmado"
          ? "Resultado registrado"
          : result?.status === "propuesto"
            ? "Resultado propuesto · esperando confirmación"
            : "Resultado enviado",
    });
    reset();
    onOpenChange(false);
    onSubmitted();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cargar resultado</DialogTitle>
          <DialogDescription>
            {registrationLabel(regA, players)} vs {registrationLabel(regB, players)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label className="mb-2 block">Tipo de resultado</Label>
            <RadioGroup value={outcome} onValueChange={(v) => setOutcome(v as Outcome)}>
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="score" /> Score normal
              </label>
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="walkover" /> Walkover (no se presentó)
              </label>
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="retired" /> Retiro durante el partido
              </label>
            </RadioGroup>
          </div>

          {outcome !== "walkover" && (
            <div>
              <Label htmlFor="score">Score</Label>
              <Input
                id="score"
                value={scoreText}
                onChange={(e) => setScoreText(e.target.value)}
                placeholder="6-4 6-3  o  6-4 7-6(5) 10-8"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Set por set, separado por espacio. Tie-break entre paréntesis.
              </p>
            </div>
          )}

          <div>
            <Label className="mb-2 block">Ganador</Label>
            <RadioGroup value={winnerId ?? ""} onValueChange={setWinnerId}>
              {regA && (
                <label className="flex items-center gap-2 text-sm">
                  <RadioGroupItem value={regA.id} /> {registrationLabel(regA, players)}
                </label>
              )}
              {regB && (
                <label className="flex items-center gap-2 text-sm">
                  <RadioGroupItem value={regB.id} /> {registrationLabel(regB, players)}
                </label>
              )}
            </RadioGroup>
            {outcome === "score" && (
              <p className="mt-1 text-xs text-muted-foreground">
                Si dejas el score, el ganador se infiere automáticamente.
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enviar resultado
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
