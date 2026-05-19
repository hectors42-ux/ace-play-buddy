import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import {
  VALIDATION_MODE_LABEL,
  slugify,
  type ResultValidationMode,
} from "@/lib/tournament-utils";
import type { Tables } from "@/integrations/supabase/types";

type Tournament = Tables<"tournaments">;

interface TournamentFormDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: "create" | "edit";
  tournament?: Tournament | null;
  onSaved: () => void;
}

/** Convierte un ISO a formato compatible con input[type=datetime-local] respetando timezone local. */
function isoToLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export const TournamentFormDialog = ({
  open,
  onOpenChange,
  mode,
  tournament,
  onSaved,
}: TournamentFormDialogProps) => {
  const { profile, user } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [validationMode, setValidationMode] =
    useState<ResultValidationMode>("jugadores_con_confirmacion");
  const [rescheduleEnabled, setRescheduleEnabled] = useState(true);
  const [rescheduleWindow, setRescheduleWindow] = useState(48);
  const [rescheduleNotice, setRescheduleNotice] = useState(12);
  const [regOpens, setRegOpens] = useState("");
  const [regCloses, setRegCloses] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && tournament) {
      setName(tournament.name);
      setDescription(tournament.description ?? "");
      setValidationMode(tournament.result_validation_mode);
      setRescheduleEnabled(tournament.reschedule_enabled);
      setRescheduleWindow(tournament.reschedule_window_hours);
      setRescheduleNotice(tournament.reschedule_min_notice_hours);
      setRegOpens(isoToLocalInput(tournament.registration_opens_at));
      setRegCloses(isoToLocalInput(tournament.registration_closes_at));
      setStartsAt(isoToLocalInput(tournament.starts_at));
      setEndsAt(isoToLocalInput(tournament.ends_at));
    } else if (mode === "create") {
      setName("");
      setDescription("");
      setValidationMode("jugadores_con_confirmacion");
      setRescheduleEnabled(true);
      setRescheduleWindow(48);
      setRescheduleNotice(12);
      setRegOpens("");
      setRegCloses("");
      setStartsAt("");
      setEndsAt("");
    }
  }, [open, mode, tournament]);

  const handleSubmit = async () => {
    if (!profile || !user) return;
    if (!name || !regOpens || !regCloses || !startsAt || !endsAt) {
      toast({ title: "Completa todos los campos", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    if (mode === "create") {
      const { error } = await supabase.from("tournaments").insert({
        tenant_id: profile.tenant_id,
        name,
        slug: `${slugify(name)}-${Math.random().toString(36).slice(2, 6)}`,
        description: description || null,
        result_validation_mode: validationMode,
        reschedule_enabled: rescheduleEnabled,
        reschedule_window_hours: rescheduleWindow,
        reschedule_min_notice_hours: rescheduleNotice,
        registration_opens_at: new Date(regOpens).toISOString(),
        registration_closes_at: new Date(regCloses).toISOString(),
        starts_at: new Date(startsAt).toISOString(),
        ends_at: new Date(endsAt).toISOString(),
        status: "borrador",
        created_by: user.id,
      });
      setSubmitting(false);
      if (error) {
        toast({ title: "Error al crear", description: error.message, variant: "destructive" });
        return;
      }
      toast({
        title: "Torneo creado",
        description: "Ahora agrégale categorías (Singles A, B, Damas…).",
      });
    } else {
      if (!tournament) {
        setSubmitting(false);
        return;
      }
      const { error } = await supabase
        .from("tournaments")
        .update({
          name,
          description: description || null,
          result_validation_mode: validationMode,
          reschedule_enabled: rescheduleEnabled,
          reschedule_window_hours: rescheduleWindow,
          reschedule_min_notice_hours: rescheduleNotice,
          registration_opens_at: new Date(regOpens).toISOString(),
          registration_closes_at: new Date(regCloses).toISOString(),
          starts_at: new Date(startsAt).toISOString(),
          ends_at: new Date(endsAt).toISOString(),
        })
        .eq("id", tournament.id);
      setSubmitting(false);
      if (error) {
        toast({ title: "Error al guardar", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "Cambios guardados" });
    }
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Nuevo torneo (evento)" : "Editar torneo"}
          </DialogTitle>
        </DialogHeader>
        <div className="max-h-[70vh] space-y-3 overflow-y-auto py-2 pr-1">
          <div>
            <Label htmlFor="t-name">Nombre del evento</Label>
            <Input
              id="t-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Apertura 2026"
            />
          </div>
          <div>
            <Label htmlFor="t-desc">Descripción</Label>
            <Textarea
              id="t-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div>
            <Label>Quién carga los resultados</Label>
            <Select
              value={validationMode}
              onValueChange={(v) => setValidationMode(v as ResultValidationMode)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(VALIDATION_MODE_LABEL) as ResultValidationMode[]).map((m) => (
                  <SelectItem key={m} value={m}>
                    {VALIDATION_MODE_LABEL[m]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-border bg-muted/30 px-3 py-2">
            <div>
              <Label className="cursor-pointer">Reagendamiento entre jugadores</Label>
              <p className="text-xs text-muted-foreground">
                Acuerdo entre rivales sin pasar por admin
              </p>
            </div>
            <Switch checked={rescheduleEnabled} onCheckedChange={setRescheduleEnabled} />
          </div>

          {rescheduleEnabled && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="t-rw">Ventana (horas)</Label>
                <Input
                  id="t-rw"
                  type="number"
                  min={1}
                  value={rescheduleWindow}
                  onChange={(e) => setRescheduleWindow(Number(e.target.value))}
                />
              </div>
              <div>
                <Label htmlFor="t-rn">Anticipación mínima (horas)</Label>
                <Input
                  id="t-rn"
                  type="number"
                  min={0}
                  value={rescheduleNotice}
                  onChange={(e) => setRescheduleNotice(Number(e.target.value))}
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="t-ro">Inscripciones desde</Label>
              <Input
                id="t-ro"
                type="datetime-local"
                value={regOpens}
                onChange={(e) => setRegOpens(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="t-rc">Inscripciones hasta</Label>
              <Input
                id="t-rc"
                type="datetime-local"
                value={regCloses}
                onChange={(e) => setRegCloses(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="t-sa">Inicio del torneo</Label>
              <Input
                id="t-sa"
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="t-ea">Fin del torneo</Label>
              <Input
                id="t-ea"
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === "create" ? "Crear evento" : "Guardar cambios"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
