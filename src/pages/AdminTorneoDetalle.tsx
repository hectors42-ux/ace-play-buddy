import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Download, FileSpreadsheet, FileText, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TournamentCalendarPanel } from "@/components/tournaments/TournamentCalendarPanel";
import { TournamentFormDialog } from "@/components/tournaments/TournamentFormDialog";
import { toast } from "@/hooks/use-toast";
import {
  DISCIPLINE_LABEL,
  GENDER_LABEL,
  TOURNAMENT_STATUS_LABEL,
  tournamentStatusColor,
  type CategoryGender,
  type TournamentDiscipline,
  type TournamentStatus,
} from "@/lib/tournament-utils";
import type { Tables } from "@/integrations/supabase/types";

type Tournament = Tables<"tournaments">;
type Category = Tables<"tournament_categories">;

const AdminTorneoDetalle = () => {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("Singles A");
  const [discipline, setDiscipline] = useState<TournamentDiscipline>("tenis_singles");
  const [gender, setGender] = useState<CategoryGender>("varones");
  const [maxParticipants, setMaxParticipants] = useState(32);
  const [submitting, setSubmitting] = useState(false);
  const [exporting, setExporting] = useState<"pdf" | "xlsx" | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const handleExport = async (format: "pdf" | "xlsx") => {
    if (!tournament) return;
    setExporting(format);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/export-tournament`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ tournament_id: tournament.id, format }),
      });
      if (!res.ok) throw new Error(`Export failed (${res.status})`);
      const blob = await res.blob();
      const filename = `${tournament.slug || "torneo"}.${format}`;
      const dlUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = dlUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(dlUrl);
      toast({ title: "Exportación lista", description: filename });
    } catch (err) {
      toast({
        title: "Error al exportar",
        description: err instanceof Error ? err.message : "Inténtalo nuevamente",
        variant: "destructive",
      });
    } finally {
      setExporting(null);
    }
  };

  const load = async () => {
    if (!id) return;
    const [{ data: t }, { data: cats }] = await Promise.all([
      supabase.from("tournaments").select("*").eq("id", id).maybeSingle(),
      supabase
        .from("tournament_categories")
        .select("*")
        .eq("tournament_id", id)
        .order("sort_order")
        .order("created_at"),
    ]);
    setTournament(t);
    setCategories(cats ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleCreateCategory = async () => {
    if (!tournament || !profile) return;
    setSubmitting(true);
    const { error } = await supabase.from("tournament_categories").insert({
      tournament_id: tournament.id,
      tenant_id: profile.tenant_id,
      name,
      category_label: name,
      discipline,
      gender,
      max_participants: maxParticipants,
    });
    setSubmitting(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Categoría creada" });
    setOpen(false);
    setName("Singles B");
    load();
  };

  const handleDeleteCategory = async (catId: string) => {
    if (!confirm("¿Eliminar esta categoría?")) return;
    const { error } = await supabase.from("tournament_categories").delete().eq("id", catId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Categoría eliminada" });
    load();
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-warm">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-gradient-warm">
        <p className="text-sm text-muted-foreground">Torneo no encontrado</p>
        <Link to="/admin/torneos" className="text-sm text-primary underline">
          Volver
        </Link>
      </div>
    );
  }

  const status = tournament.status as TournamentStatus;

  return (
    <div className="min-h-screen bg-gradient-warm pb-12">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-5 py-4">
          <Link
            to="/admin/torneos"
            className="flex h-9 w-9 items-center justify-center rounded-2xl border border-border bg-card text-muted-foreground hover:text-foreground"
            aria-label="Volver"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-lg font-semibold">{tournament.name}</h1>
            <p className="text-xs text-muted-foreground">{categories.length} categorías</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="shrink-0"
            onClick={() => setEditOpen(true)}
          >
            <Pencil className="mr-1 h-4 w-4" /> Editar
          </Button>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${tournamentStatusColor(status)}`}
          >
            {TOURNAMENT_STATUS_LABEL[status]}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-4 px-5 pt-4">
        <Tabs defaultValue="categorias">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="categorias">Categorías</TabsTrigger>
            <TabsTrigger value="calendario">Calendario</TabsTrigger>
          </TabsList>

          <TabsContent value="categorias" className="mt-4">
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Categorías
                </h3>
                <Button size="sm" onClick={() => setOpen(true)}>
                  <Plus className="mr-1 h-4 w-4" /> Agregar
                </Button>
              </div>

              {categories.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-border bg-card/50 p-6 text-center text-sm text-muted-foreground">
                  Crea las categorías del torneo (Singles A, B, C, Damas, Dobles…).
                </p>
              ) : (
                <div className="space-y-2">
                  {categories.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between gap-2 rounded-2xl border border-border bg-card px-4 py-3"
                    >
                      <Link to={`/admin/torneos/${tournament.id}/cat/${c.id}`} className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{c.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {DISCIPLINE_LABEL[c.discipline]} · {GENDER_LABEL[c.gender]} · cupo {c.max_participants}
                        </p>
                      </Link>
                      <Button size="sm" variant="outline" asChild>
                        <Link to={`/admin/torneos/${tournament.id}/cat/${c.id}`}>Gestionar</Link>
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => handleDeleteCategory(c.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </TabsContent>

          <TabsContent value="calendario" className="mt-4">
            {profile && (
              <TournamentCalendarPanel
                tournamentId={tournament.id}
                tenantId={profile.tenant_id}
              />
            )}
          </TabsContent>
        </Tabs>

        <section className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center gap-2">
            <Download className="h-4 w-4 text-primary" />
            <h3 className="font-display text-sm font-semibold">Exportar torneo</h3>
          </div>
          <p className="mb-3 text-xs text-muted-foreground">
            Genera el reporte completo con bracket, ranking final, inscritos y resultados.
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={() => handleExport("pdf")}
              disabled={exporting !== null}
            >
              {exporting === "pdf" ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <FileText className="mr-1 h-4 w-4" />
              )}
              PDF
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={() => handleExport("xlsx")}
              disabled={exporting !== null}
            >
              {exporting === "xlsx" ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <FileSpreadsheet className="mr-1 h-4 w-4" />
              )}
              Excel
            </Button>
          </div>
        </section>

        <p className="text-xs text-muted-foreground">
          Entra a cada categoría para gestionar inscripciones, generar la llave, programar partidos y
          cargar resultados.
        </p>
      </main>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva categoría</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label htmlFor="c-name">Nombre</Label>
              <Input
                id="c-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Singles A"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Disciplina</Label>
                <Select value={discipline} onValueChange={(v) => setDiscipline(v as TournamentDiscipline)}>
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
                <Label>Género</Label>
                <Select value={gender} onValueChange={(v) => setGender(v as CategoryGender)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="varones">Varones</SelectItem>
                    <SelectItem value="damas">Damas</SelectItem>
                    <SelectItem value="mixto">Mixto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label htmlFor="c-max">Cupo máximo</Label>
                <Input
                  id="c-max"
                  type="number"
                  min={2}
                  max={128}
                  value={maxParticipants}
                  onChange={(e) => setMaxParticipants(Number(e.target.value))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateCategory} disabled={submitting || !name}>
              Crear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TournamentFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        mode="edit"
        tournament={tournament}
        onSaved={() => {
          setEditOpen(false);
          load();
        }}
      />
    </div>
  );
};

export default AdminTorneoDetalle;

export default AdminTorneoDetalle;
