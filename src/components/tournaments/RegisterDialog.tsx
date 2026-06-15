import { useState } from "react";
import { Info, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { PartnerPicker } from "@/components/PartnerPicker";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Category } from "@/hooks/useCategoryData";
import { useTournamentSessions } from "@/hooks/useTournamentSessions";

interface RegisterDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  category: Category | null;
  onRegistered: () => void;
}

export const RegisterDialog = ({
  open,
  onOpenChange,
  category,
  onRegistered,
}: RegisterDialogProps) => {
  const { profile } = useAuth();
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sessionAvailability, setSessionAvailability] = useState<string[]>([]);
  const tournamentId = (category as { tournament_id?: string } | null)?.tournament_id ?? null;
  const { sessions } = useTournamentSessions(tournamentId);

  const motor = (category as { motor?: string } | null)?.motor;
  const isAmericanoRotacion = motor === "americano_rotacion";
  const isDoubles =
    !isAmericanoRotacion &&
    (category?.discipline === "tenis_dobles" || category?.discipline === "padel_dobles");

  if (!category) return null;

  const handleSubmit = async () => {
    if (isDoubles && !partnerId) {
      toast({ title: "Elige una pareja", variant: "destructive" });
      return;
    }
    if (sessions.length > 0 && sessionAvailability.length === 0) {
      toast({
        title: "Confirma al menos una sesión",
        description: "Marca tus disponibilidades antes de inscribirte.",
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.rpc("register_to_category", {
      _category_id: category.id,
      _player2_user_id: isDoubles ? partnerId ?? undefined : undefined,
      _session_availability: sessions.length > 0 ? sessionAvailability : [],
    } as never);
    setSubmitting(false);
    if (error) {
      toast({ title: "No se pudo inscribir", description: error.message, variant: "destructive" });
      return;
    }
    toast({
      title: isDoubles ? "Invitación enviada a tu pareja" : "Inscripción enviada",
      description: isDoubles
        ? "Quedará confirmada cuando tu pareja acepte y el admin apruebe."
        : "El admin revisará tu inscripción.",
    });
    setPartnerId(null);
    setSessionAvailability([]);
    onOpenChange(false);
    onRegistered();
  };

  const toggleSession = (id: string, on: boolean) => {
    setSessionAvailability((prev) =>
      on ? Array.from(new Set([...prev, id])) : prev.filter((x) => x !== id),
    );
  };

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString("es-CL", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Inscribirse · {category.name}</DialogTitle>
          <DialogDescription>
            {isDoubles
              ? "Busca a tu pareja por nombre. Debe aceptar la invitación antes de que la inscripción quede pendiente de aprobación."
              : "El admin del torneo confirmará tu inscripción."}
          </DialogDescription>
        </DialogHeader>

        {isDoubles && (
          <div className="space-y-2 py-2">
            <Label>Pareja</Label>
            <PartnerPicker value={partnerId} onChange={(id) => setPartnerId(id)} />
          </div>
        )}

        {sessions.length > 0 && (
          <div className="space-y-3 py-2">
            <Label className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Confirmo mi disponibilidad
            </Label>
            <div className="space-y-2">
              {sessions.map((s) => {
                const on = sessionAvailability.includes(s.id);
                return (
                  <label
                    key={s.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-3 py-2 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{s.name}</p>
                      <p className="text-xs text-muted-foreground">{fmt(s.starts_at)}</p>
                    </div>
                    <Switch checked={on} onCheckedChange={(v) => toggleSession(s.id, v)} />
                  </label>
                );
              })}
            </div>
            <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
              <Info className="mt-0.5 h-3 w-3 shrink-0" />
              El sorteo solo te agenda en las sesiones que confirmes.
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Inscribirme
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
