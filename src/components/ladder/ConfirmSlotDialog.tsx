import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarClock, Check, Loader2, MapPin } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface SlotOption {
  index: 1 | 2 | 3;
  court_id: string;
  court_name: string;
  starts_at: string;
}

interface ConfirmSlotDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  challengeId: string;
  onConfirmed?: () => void;
}

interface ProposalRow {
  id: string;
  slot1_court_id: string;
  slot1_starts_at: string;
  slot2_court_id: string | null;
  slot2_starts_at: string | null;
  slot3_court_id: string | null;
  slot3_starts_at: string | null;
}

export const ConfirmSlotDialog = ({
  open,
  onOpenChange,
  challengeId,
  onConfirmed,
}: ConfirmSlotDialogProps) => {
  const [proposal, setProposal] = useState<ProposalRow | null>(null);
  const [options, setOptions] = useState<SlotOption[]>([]);
  const [selected, setSelected] = useState<1 | 2 | 3 | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setSelected(null);
      setProposal(null);
      setOptions([]);
      return;
    }
    void (async () => {
      setLoading(true);
      const { data: prop } = await supabase
        .from("ladder_challenge_schedule_proposals")
        .select("*")
        .eq("challenge_id", challengeId)
        .eq("status", "pendiente")
        .order("proposed_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!prop) {
        setLoading(false);
        toast({
          title: "Sin horarios propuestos",
          description: "Tu rival aún no propone horarios.",
        });
        onOpenChange(false);
        return;
      }

      const courtIds = [prop.slot1_court_id, prop.slot2_court_id, prop.slot3_court_id].filter(
        (id): id is string => !!id,
      );
      const { data: courts } = await supabase
        .from("courts")
        .select("id, name")
        .in("id", courtIds);
      const nameById = Object.fromEntries((courts ?? []).map((c) => [c.id, c.name]));

      const opts: SlotOption[] = [];
      if (prop.slot1_court_id && prop.slot1_starts_at) {
        opts.push({
          index: 1,
          court_id: prop.slot1_court_id,
          court_name: nameById[prop.slot1_court_id] ?? "Cancha",
          starts_at: prop.slot1_starts_at,
        });
      }
      if (prop.slot2_court_id && prop.slot2_starts_at) {
        opts.push({
          index: 2,
          court_id: prop.slot2_court_id,
          court_name: nameById[prop.slot2_court_id] ?? "Cancha",
          starts_at: prop.slot2_starts_at,
        });
      }
      if (prop.slot3_court_id && prop.slot3_starts_at) {
        opts.push({
          index: 3,
          court_id: prop.slot3_court_id,
          court_name: nameById[prop.slot3_court_id] ?? "Cancha",
          starts_at: prop.slot3_starts_at,
        });
      }
      setProposal(prop as ProposalRow);
      setOptions(opts);
      setLoading(false);
    })();
  }, [open, challengeId, onOpenChange]);

  const handleConfirm = async () => {
    if (!proposal || !selected) return;
    setSubmitting(true);
    const { error } = await supabase.rpc("confirm_ladder_challenge_slot", {
      _proposal_id: proposal.id,
      _slot_index: selected,
    });
    setSubmitting(false);
    if (error) {
      toast({
        title: "No se pudo confirmar",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "¡Partido confirmado!",
      description: "La cancha quedó reservada para ambos.",
    });
    onOpenChange(false);
    onConfirmed?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <CalendarClock className="h-5 w-5 text-primary" />
            Elige un horario
          </DialogTitle>
          <DialogDescription>
            Tu rival propuso estos horarios. Al confirmar, la cancha se reserva automáticamente.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-2">
            {options.map((opt) => {
              const isSel = selected === opt.index;
              return (
                <button
                  key={opt.index}
                  type="button"
                  onClick={() => setSelected(opt.index)}
                  className={cn(
                    "w-full rounded-2xl border p-3 text-left transition-smooth",
                    isSel
                      ? "border-primary bg-primary/10 ring-1 ring-primary"
                      : "border-border bg-card hover:bg-muted/40",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-display text-sm font-semibold">
                        {format(parseISO(opt.starts_at), "EEE d MMM · HH:mm 'h'", { locale: es })}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {opt.court_name}
                      </p>
                    </div>
                    {isSel && <Check className="h-4 w-4 text-primary" />}
                  </div>
                </button>
              );
            })}
          </div>
        )}

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
            disabled={submitting || !selected}
            className="flex-1"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
