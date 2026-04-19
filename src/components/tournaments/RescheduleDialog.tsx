import { useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Court, Match } from "@/hooks/useCategoryData";

interface RescheduleDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  match: Match | null;
  courts: Court[];
  windowHours: number;
  minNoticeHours: number;
  onRequested: () => void;
}

export const RescheduleDialog = ({
  open,
  onOpenChange,
  match,
  courts,
  windowHours,
  minNoticeHours,
  onRequested,
}: RescheduleDialogProps) => {
  const [courtId, setCourtId] = useState<string>("");
  const [startsAt, setStartsAt] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  if (!match) return null;

  const handleSubmit = async () => {
    if (!courtId || !startsAt) {
      toast({ title: "Elige nueva cancha y horario", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.rpc("request_match_reschedule", {
      _match_id: match.id,
      _proposed_court_id: courtId,
      _proposed_starts_at: new Date(startsAt).toISOString(),
    });
    setSubmitting(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({
      title: "Propuesta enviada",
      description: "Tu rival debe aceptarla para mover el partido.",
    });
    setCourtId("");
    setStartsAt("");
    onOpenChange(false);
    onRequested();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Proponer nuevo horario</DialogTitle>
          <DialogDescription>
            Tu rival recibirá la propuesta. Ventana ±{windowHours}h · mínimo {minNoticeHours}h de
            anticipación.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div>
            <Label>Cancha</Label>
            <Select value={courtId} onValueChange={setCourtId}>
              <SelectTrigger>
                <SelectValue placeholder="Elige una cancha" />
              </SelectTrigger>
              <SelectContent>
                {courts.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="resch-at">Nuevo horario</Label>
            <Input
              id="resch-at"
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enviar propuesta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
