import { useMemo, useState } from "react";
import { Loader2, Swords, Clock, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cooldownDaysRemaining } from "@/lib/ladder-utils";
import type { LadderRow, PositionRow } from "@/hooks/useLadderData";

interface ChallengeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ladder: LadderRow;
  myPosition: PositionRow;
  target: PositionRow;
  targetName: string;
  lastPlayedBetween: string | null;
  onCreated?: () => void;
}

export const ChallengeDialog = ({
  open,
  onOpenChange,
  ladder,
  myPosition,
  target,
  targetName,
  lastPlayedBetween,
  onCreated,
}: ChallengeDialogProps) => {
  const [submitting, setSubmitting] = useState(false);

  const cooldownLeft = useMemo(
    () => cooldownDaysRemaining(lastPlayedBetween, ladder.cooldown_days),
    [lastPlayedBetween, ladder.cooldown_days],
  );

  const positionsToClimb = myPosition.position - target.position;
  const blocked = cooldownLeft > 0;

  const handleConfirm = async () => {
    setSubmitting(true);
    const { error } = await supabase.rpc("create_ladder_challenge", {
      _ladder_id: ladder.id,
      _challenged_user_id: target.user_id,
    });
    setSubmitting(false);
    if (error) {
      toast({
        title: "No se pudo crear el desafío",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "Desafío enviado",
      description: `${targetName} tiene ${ladder.response_window_hours}h para responder.`,
    });
    onOpenChange(false);
    onCreated?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <Swords className="h-5 w-5 text-primary" /> Desafiar
          </DialogTitle>
          <DialogDescription>
            Confirma para retar a {targetName}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-2xl border border-border bg-muted/40 p-3">
            <div className="text-center">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Tú</p>
              <p className="font-display text-2xl font-semibold">#{myPosition.position}</p>
            </div>
            <div className="text-center text-xs text-muted-foreground">
              <p>Subes</p>
              <p className="font-display text-lg font-semibold text-primary">
                +{positionsToClimb}
              </p>
              <p>posición{positionsToClimb === 1 ? "" : "es"}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Rival</p>
              <p className="font-display text-2xl font-semibold text-primary">
                #{target.position}
              </p>
            </div>
          </div>

          <ul className="space-y-2 text-xs text-muted-foreground">
            <li className="flex items-start gap-2">
              <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                Tu rival tiene <strong>{ladder.response_window_hours}h</strong> para
                aceptar/rechazar.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                Ventana para jugar tras aceptar: <strong>{ladder.challenge_window_days} días</strong>.
              </span>
            </li>
            {ladder.cooldown_days > 0 && (
              <li className="flex items-start gap-2">
                <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  Cooldown entre el mismo par: <strong>{ladder.cooldown_days} días</strong>.
                </span>
              </li>
            )}
          </ul>

          {blocked && (
            <div className="flex items-start gap-2 rounded-2xl border border-warning/40 bg-warning/10 p-3 text-xs text-warning-foreground">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
              <span>
                Cooldown activo: faltan <strong>{cooldownLeft} día{cooldownLeft === 1 ? "" : "s"}</strong>{" "}
                para que puedas volver a desafiar a este jugador.
              </span>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            variant="clay"
            onClick={handleConfirm}
            disabled={submitting || blocked}
            className="flex-1"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>Enviar desafío</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
