import { useEffect, useMemo, useState } from "react";
import { addDays, addHours, format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarClock, Loader2, MapPin, Plus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";

interface ProposeSlotsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  challengeId: string;
  tenantId: string;
  windowDays: number;
  onProposed?: () => void;
}

interface SlotDraft {
  court_id: string;
  starts_at: string; // datetime-local format YYYY-MM-DDTHH:mm
}

const emptySlot: SlotDraft = { court_id: "", starts_at: "" };

const toLocalInputValue = (d: Date): string => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const ProposeSlotsDialog = ({
  open,
  onOpenChange,
  challengeId,
  tenantId,
  windowDays,
  onProposed,
}: ProposeSlotsDialogProps) => {
  const [courts, setCourts] = useState<Tables<"courts">[]>([]);
  const [slots, setSlots] = useState<SlotDraft[]>([{ ...emptySlot }]);
  const [submitting, setSubmitting] = useState(false);

  const minDate = useMemo(() => toLocalInputValue(addHours(new Date(), 1)), []);
  const maxDate = useMemo(
    () => toLocalInputValue(addDays(new Date(), windowDays)),
    [windowDays],
  );

  useEffect(() => {
    if (!open) return;
    void (async () => {
      const { data } = await supabase
        .from("courts")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      setCourts((data ?? []) as Tables<"courts">[]);
    })();
  }, [open, tenantId]);

  useEffect(() => {
    if (!open) {
      setSlots([{ ...emptySlot }]);
      setSubmitting(false);
    }
  }, [open]);

  const updateSlot = (idx: number, patch: Partial<SlotDraft>) => {
    setSlots((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  };

  const addSlot = () => {
    if (slots.length >= 3) return;
    setSlots((prev) => [...prev, { ...emptySlot }]);
  };

  const removeSlot = (idx: number) => {
    setSlots((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    const cleaned = slots.filter((s) => s.court_id && s.starts_at);
    if (cleaned.length === 0) {
      toast({
        title: "Agrega al menos un horario",
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    const payload = cleaned.map((s) => ({
      court_id: s.court_id,
      starts_at: new Date(s.starts_at).toISOString(),
    }));
    const { error } = await supabase.rpc("propose_ladder_challenge_slots", {
      _challenge_id: challengeId,
      _slots: payload,
    });
    setSubmitting(false);
    if (error) {
      toast({
        title: "No se pudieron proponer horarios",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "Horarios enviados",
      description: "Tu rival debe elegir uno para confirmar el partido.",
    });
    onOpenChange(false);
    onProposed?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <CalendarClock className="h-5 w-5 text-primary" />
            Propón hasta 3 horarios
          </DialogTitle>
          <DialogDescription>
            Tu rival elegirá uno. La cancha se reserva automáticamente. Ventana de {windowDays} días desde hoy.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {slots.map((s, idx) => (
            <div
              key={idx}
              className="space-y-2 rounded-2xl border border-border bg-muted/30 p-3"
            >
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Horario {idx + 1}
                </p>
                {slots.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeSlot(idx)}
                    className="text-muted-foreground hover:text-destructive"
                    aria-label={`Quitar horario ${idx + 1}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] text-muted-foreground">
                  <MapPin className="mr-1 inline h-3 w-3" /> Cancha
                </Label>
                <Select
                  value={s.court_id}
                  onValueChange={(v) => updateSlot(idx, { court_id: v })}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Elige cancha" />
                  </SelectTrigger>
                  <SelectContent>
                    {courts.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} · {c.surface}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] text-muted-foreground">
                  <CalendarClock className="mr-1 inline h-3 w-3" /> Día y hora
                </Label>
                <Input
                  type="datetime-local"
                  value={s.starts_at}
                  min={minDate}
                  max={maxDate}
                  onChange={(e) => updateSlot(idx, { starts_at: e.target.value })}
                  className="h-9"
                />
                {s.starts_at && (
                  <p className="text-[11px] text-muted-foreground">
                    {format(parseISO(s.starts_at), "EEEE d MMM HH:mm 'h'", { locale: es })}
                  </p>
                )}
              </div>
            </div>
          ))}

          {slots.length < 3 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full gap-1.5"
              onClick={addSlot}
            >
              <Plus className="h-3.5 w-3.5" /> Agregar otro horario
            </Button>
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
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enviar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
