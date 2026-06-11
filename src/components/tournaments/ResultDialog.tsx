import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
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
import {
  ScoreboardEditor,
  editorToSetScores,
  emptyScoreboardValue,
  validateScoreboardValue,
  type ScoreboardEditorValue,
} from "@/components/match/ScoreboardEditor";
import {
  resolveScoringProfile,
  validateScore as validateProfileScore,
  type ScoringProfile,
} from "@/lib/scoring-profile";

interface ResultDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  match: Match | null;
  registrations: Registration[];
  players: Map<string, Player>;
  onSubmitted: () => void;
  /** Categoría del partido — para resolver el perfil de scoring (PRD 8). */
  category?: { config?: unknown } | null;
}

export const ResultDialog = ({
  open,
  onOpenChange,
  match,
  registrations,
  players,
  onSubmitted,
  category,
}: ResultDialogProps) => {
  const [value, setValue] = useState<ScoreboardEditorValue>(emptyScoreboardValue());
  const [submitting, setSubmitting] = useState(false);
  const profile: ScoringProfile = useMemo(
    () => resolveScoringProfile(category ?? null),
    [category],
  );

  const regsById = useMemo(
    () => new Map(registrations.map((r) => [r.id, r])),
    [registrations],
  );
  const regA = match?.registration_a_id ? regsById.get(match.registration_a_id) : undefined;
  const regB = match?.registration_b_id ? regsById.get(match.registration_b_id) : undefined;

  if (!match) return null;

  const reset = () => setValue(emptyScoreboardValue());

  const handleSubmit = async () => {
    if (!regA || !regB) {
      toast({ title: "Faltan jugadores en este partido", variant: "destructive" });
      return;
    }
    const sets = editorToSetScores(value, profile);
    const isWalkover = value.outcome === "walkover";
    const isRetired = value.outcome === "retired";

    const meId = regA.id;
    const opponentId = regB.id;
    const validation = validateScoreboardValue(value, meId, opponentId, profile);
    if (!validation.ok) {
      toast({ title: validation.message, variant: "destructive" });
      return;
    }
    if (!isWalkover && !isRetired) {
      const profileCheck = validateProfileScore(sets, profile);
      if (!profileCheck.ok) {
        toast({ title: profileCheck.error, variant: "destructive" });
        return;
      }
    }

    setSubmitting(true);
    const { data, error } = await supabase.rpc("submit_match_result", {
      _match_id: match.id,
      _winner_registration_id: value.winnerId,
      _score: (isWalkover ? null : sets) as never,
      _walkover: isWalkover,
      _retired: isRetired,
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Cargar resultado</DialogTitle>
          <DialogDescription>
            {registrationLabel(regA, players)} vs {registrationLabel(regB, players)}
          </DialogDescription>
        </DialogHeader>

        <ScoreboardEditor
          me={{ id: regA?.id ?? "a", name: registrationLabel(regA, players) }}
          opponent={{ id: regB?.id ?? "b", name: registrationLabel(regB, players) }}
          value={value}
          onChange={setValue}
          profile={profile}
        />

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
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
