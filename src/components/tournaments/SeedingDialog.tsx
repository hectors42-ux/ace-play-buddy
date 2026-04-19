import { useState } from "react";
import { ArrowDown, ArrowUp, Loader2, Wand2 } from "lucide-react";
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
import { Player, Registration, registrationLabel } from "@/hooks/useCategoryData";

interface SeedingDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  categoryId: string;
  registrations: Registration[];
  players: Map<string, Player>;
  onGenerated: () => void;
}

export const SeedingDialog = ({
  open,
  onOpenChange,
  categoryId,
  registrations,
  players,
  onGenerated,
}: SeedingDialogProps) => {
  const confirmed = registrations.filter((r) => r.status === "confirmada");
  const [order, setOrder] = useState<string[]>(confirmed.map((r) => r.id));
  const [submitting, setSubmitting] = useState(false);

  // re-sync if registrations change while dialog opens
  const syncedKey = confirmed.map((r) => r.id).join(",");
  const orderKey = order.filter((id) => id).join(",");
  if (open && orderKey !== syncedKey && order.length === 0) {
    setOrder(confirmed.map((r) => r.id));
  }

  const move = (idx: number, dir: -1 | 1) => {
    const next = [...order];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    setOrder(next);
  };

  const insertBye = (idx: number) => {
    const next = [...order];
    next.splice(idx + 1, 0, "");
    setOrder(next);
  };

  const removeBye = (idx: number) => {
    const next = [...order];
    if (next[idx] === "") next.splice(idx, 1);
    setOrder(next);
  };

  const autoSeed = () => {
    setOrder(confirmed.map((r) => r.id));
  };

  const handleGenerate = async () => {
    if (confirmed.length < 2) {
      toast({ title: "Necesitas al menos 2 inscripciones confirmadas", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const seedOrder = order.map((id) => (id === "" ? null : id));
    const { error } = await supabase.rpc("generate_bracket", {
      _category_id: categoryId,
      _seed_order: seedOrder as never,
    });
    setSubmitting(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({
      title: "Llave generada",
      description: "El cuadro está listo. Ya puedes programar los partidos.",
    });
    onOpenChange(false);
    onGenerated();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Generar llave</DialogTitle>
          <DialogDescription>
            Ordena las inscripciones confirmadas. Las posiciones 1-2, 3-4, 5-6… se enfrentan en
            primera ronda. Inserta BYEs donde corresponda.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between border-b border-border pb-2">
          <span className="text-xs text-muted-foreground">
            {order.filter((x) => x).length} inscritos · {order.filter((x) => !x).length} BYEs ·{" "}
            {order.length} posiciones
          </span>
          <Button variant="ghost" size="sm" onClick={autoSeed}>
            <Wand2 className="mr-1 h-3 w-3" /> Reset
          </Button>
        </div>

        <div className="max-h-[50vh] space-y-1.5 overflow-y-auto py-1">
          {order.map((regId, idx) => {
            const reg = regId ? registrations.find((r) => r.id === regId) : undefined;
            const isBye = !regId;
            return (
              <div
                key={`${regId}-${idx}`}
                className={`flex items-center gap-2 rounded-2xl border px-3 py-2 ${
                  isBye ? "border-dashed border-border bg-muted/30" : "border-border bg-card"
                }`}
              >
                <span className="w-6 text-xs font-mono text-muted-foreground">{idx + 1}</span>
                <span className="flex-1 text-sm">
                  {isBye ? <em className="text-muted-foreground">BYE</em> : registrationLabel(reg, players)}
                </span>
                <Button size="icon" variant="ghost" onClick={() => move(idx, -1)} disabled={idx === 0}>
                  <ArrowUp className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => move(idx, 1)}
                  disabled={idx === order.length - 1}
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </Button>
                {isBye ? (
                  <Button size="sm" variant="ghost" onClick={() => removeBye(idx)}>
                    Quitar
                  </Button>
                ) : (
                  <Button size="sm" variant="ghost" onClick={() => insertBye(idx)}>
                    +BYE
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleGenerate} disabled={submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Generar llave
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
