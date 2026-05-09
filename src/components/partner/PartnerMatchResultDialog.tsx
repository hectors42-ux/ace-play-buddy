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
import { toast } from "sonner";
import { parseScoreInput, inferWinnerFromScore } from "@/lib/tournament-utils";

type Outcome = "score" | "walkover" | "retired";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  invitationId: string;
  meId: string;
  meName: string;
  opponentId: string;
  opponentName: string;
  onSubmitted?: () => void;
}

/**
 * Diálogo para cargar el resultado de un partido amistoso (partner match).
 * Crea/actualiza una propuesta en `partner_match_results`. Requiere confirmación
 * cruzada del rival para aplicar el cambio de rating (k×0.5).
 */
export const PartnerMatchResultDialog = ({
  open,
  onOpenChange,
  invitationId,
  meId,
  meName,
  opponentId,
  opponentName,
  onSubmitted,
}: Props) => {
  const [outcome, setOutcome] = useState<Outcome>("score");
  const [scoreText, setScoreText] = useState("");
  const [winnerId, setWinnerId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setOutcome("score");
    setScoreText("");
    setWinnerId(null);
  };

  const handleSubmit = async () => {
    let parsedScore: ReturnType<typeof parseScoreInput> = null;
    let resolvedWinner = winnerId;
    let walkover = false;
    let retired = false;

    if (outcome === "score") {
      parsedScore = parseScoreInput(scoreText);
      if (!parsedScore || parsedScore.length === 0) {
        toast.error("Score inválido", {
          description: "Usa el formato 6-4 6-3 o 6-4 7-6(5)",
        });
        return;
      }
      const inferred = inferWinnerFromScore(parsedScore, meId, opponentId);
      if (inferred) resolvedWinner = inferred;
      if (!resolvedWinner) {
        toast.error("Selecciona el ganador");
        return;
      }
    } else if (outcome === "walkover") {
      walkover = true;
      if (!resolvedWinner) {
        toast.error("Selecciona quién avanza por W.O.");
        return;
      }
    } else {
      retired = true;
      parsedScore = scoreText ? parseScoreInput(scoreText) : null;
      if (!resolvedWinner) {
        toast.error("Selecciona el ganador");
        return;
      }
    }

    setSubmitting(true);
    const { error } = await supabase.rpc("submit_partner_match_result", {
      _invitation_id: invitationId,
      _winner_user_id: resolvedWinner,
      _score: parsedScore as never,
      _walkover: walkover,
      _retired: retired,
    });
    setSubmitting(false);
    if (error) {
      toast.error("No se pudo cargar el resultado", { description: error.message });
      return;
    }
    toast.success("Resultado propuesto", {
      description: `${opponentName} debe confirmar para que se aplique al rating.`,
    });
    reset();
    onOpenChange(false);
    onSubmitted?.();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Cargar resultado del amistoso</DialogTitle>
          <DialogDescription>
            {meName} vs {opponentName}
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
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value={meId} /> {meName} (Tú)
              </label>
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value={opponentId} /> {opponentName}
              </label>
            </RadioGroup>
            {outcome === "score" && (
              <p className="mt-1 text-xs text-muted-foreground">
                Si dejas el score, el ganador se infiere automáticamente.
              </p>
            )}
          </div>

          <p className="rounded-xl border border-border bg-muted/30 p-3 text-[11px] text-muted-foreground">
            Los amistosos afectan tu rating con un peso menor al de torneos y pirámide.
            El cambio se aplica cuando {opponentName} confirma el resultado.
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={submitting} variant="clay">
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enviar resultado
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
