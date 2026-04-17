import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Trophy } from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/EmptyState";
import { toast } from "@/hooks/use-toast";
import {
  DISCIPLINE_LABEL,
  SURFACE_LABEL,
  TOURNAMENT_STATUS_LABEL,
  slugify,
  tournamentStatusColor,
  type TournamentStatus,
} from "@/lib/tournament-utils";
import type { Tables } from "@/integrations/supabase/types";

type Tournament = Tables<"tournaments">;

const AdminTorneos = () => {
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // form
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [discipline, setDiscipline] = useState<"tenis_singles" | "tenis_dobles">("tenis_singles");
  const [surface, setSurface] = useState<"arcilla" | "dura" | "cesped" | "sintetico">("arcilla");
  const [category, setCategory] = useState("Open");
  const [maxParticipants, setMaxParticipants] = useState(16);
  const [regOpens, setRegOpens] = useState("");
  const [regCloses, setRegCloses] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");

  const load = async () => {
    const { data } = await supabase
      .from("tournaments")
      .select("*")
      .order("created_at", { ascending: false });
    setTournaments(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async () => {
    if (!profile || !user) return;
    if (!name || !regOpens || !regCloses || !startsAt || !endsAt) {
      toast({ title: "Completa todos los campos", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("tournaments").insert({
      tenant_id: profile.tenant_id,
      name,
      slug: `${slugify(name)}-${Math.random().toString(36).slice(2, 6)}`,
      description: description || null,
      discipline,
      surface,
      category,
      max_participants: maxParticipants,
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
    toast({ title: "Torneo creado", description: "Cámbialo a 'inscripciones abiertas' cuando esté listo." });
    setCreateOpen(false);
    setName("");
    setDescription("");
    setRegOpens("");
    setRegCloses("");
    setStartsAt("");
    setEndsAt("");
    load();
  };

  const handleStatusChange = async (id: string, status: TournamentStatus) => {
    const { error } = await supabase.from("tournaments").update({ status }).eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Estado actualizado" });
    load();
  };

  return (
    <div className="min-h-screen bg-gradient-warm pb-12">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-5 py-4">
          <Link
            to="/"
            className="flex h-9 w-9 items-center justify-center rounded-2xl border border-border bg-card text-muted-foreground hover:text-foreground"
            aria-label="Volver"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex-1">
            <h1 className="font-display text-xl font-semibold">Administrar torneos</h1>
            <p className="text-xs text-muted-foreground">Crea, abre inscripciones y gestiona</p>
          </div>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1 h-4 w-4" /> Nuevo
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-3 px-5 pt-4">
        {loading ? (
          <p className="text-center text-sm text-muted-foreground">Cargando…</p>
        ) : tournaments.length === 0 ? (
          <EmptyState
            icon={Trophy}
            title="Sin torneos creados"
            description="Crea el primer torneo del club."
          />
        ) : (
          tournaments.map((t) => {
            const status = t.status as TournamentStatus;
            return (
              <div
                key={t.id}
                className="rounded-3xl border border-border bg-card p-4 shadow-card"
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-display text-base font-semibold">{t.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {DISCIPLINE_LABEL[t.discipline]} · {t.category} · {SURFACE_LABEL[t.surface]}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {format(parseISO(t.starts_at), "d MMM yyyy", { locale: es })} → cupo{" "}
                      {t.max_participants}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${tournamentStatusColor(status)}`}
                  >
                    {TOURNAMENT_STATUS_LABEL[status]}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate(`/admin/torneos/${t.id}`)}
                  >
                    Gestionar
                  </Button>
                  {status === "borrador" && (
                    <Button
                      size="sm"
                      onClick={() => handleStatusChange(t.id, "inscripciones_abiertas")}
                    >
                      Abrir inscripciones
                    </Button>
                  )}
                  {status === "inscripciones_abiertas" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleStatusChange(t.id, "inscripciones_cerradas")}
                    >
                      Cerrar inscripciones
                    </Button>
                  )}
                  {(status === "borrador" || status === "inscripciones_abiertas") && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleStatusChange(t.id, "cancelado")}
                    >
                      Cancelar
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </main>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nuevo torneo</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label htmlFor="t-name">Nombre</Label>
              <Input id="t-name" value={name} onChange={(e) => setName(e.target.value)} />
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Disciplina</Label>
                <Select value={discipline} onValueChange={(v) => setDiscipline(v as typeof discipline)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tenis_singles">Tenis singles</SelectItem>
                    <SelectItem value="tenis_dobles">Tenis dobles</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Superficie</Label>
                <Select value={surface} onValueChange={(v) => setSurface(v as typeof surface)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="arcilla">Arcilla</SelectItem>
                    <SelectItem value="dura">Dura</SelectItem>
                    <SelectItem value="cesped">Césped</SelectItem>
                    <SelectItem value="sintetico">Sintético</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="t-cat">Categoría</Label>
                <Input
                  id="t-cat"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Open, Sub-14, Damas…"
                />
              </div>
              <div>
                <Label htmlFor="t-max">Cupo</Label>
                <Input
                  id="t-max"
                  type="number"
                  min={2}
                  max={128}
                  value={maxParticipants}
                  onChange={(e) => setMaxParticipants(Number(e.target.value))}
                />
              </div>
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
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={submitting}>
              Crear torneo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminTorneos;
