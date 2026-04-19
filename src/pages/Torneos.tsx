import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Calendar, Layers, Trophy, Search, Filter } from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/providers/AuthProvider";
import { BottomNav } from "@/components/BottomNav";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { EmptyState } from "@/components/EmptyState";
import { NotificationCenter } from "@/components/NotificationCenter";
import { Input } from "@/components/ui/input";
import { TournamentCardSkeleton } from "@/components/tournaments/TournamentCardSkeleton";
import { cn } from "@/lib/utils";
import {
  TOURNAMENT_STATUS_LABEL,
  tournamentStatusColor,
  type TournamentStatus,
} from "@/lib/tournament-utils";
import type { Tables } from "@/integrations/supabase/types";

type DisciplineFilter = "todas" | "tenis_singles" | "tenis_dobles";

type Tournament = Tables<"tournaments"> & {
  tournament_categories: Pick<
    Tables<"tournament_categories">,
    "id" | "name" | "discipline" | "max_participants"
  >[];
};

const Torneos = () => {
  const { isAdmin } = useAuth();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [discipline, setDiscipline] = useState<DisciplineFilter>("todas");

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("tournaments")
        .select("*, tournament_categories(id, name, discipline, max_participants)")
        .order("starts_at", { ascending: false });
      setTournaments((data ?? []) as Tournament[]);
      setLoading(false);
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tournaments.filter((t) => {
      if (q && !t.name.toLowerCase().includes(q)) return false;
      if (discipline !== "todas") {
        const cats = t.tournament_categories ?? [];
        if (!cats.some((c) => c.discipline === discipline)) return false;
      }
      return true;
    });
  }, [tournaments, search, discipline]);

  const grouped = useMemo(() => {
    const open: Tournament[] = [];
    const upcoming: Tournament[] = [];
    const active: Tournament[] = [];
    const finished: Tournament[] = [];
    for (const t of filtered) {
      if (t.status === "inscripciones_abiertas") open.push(t);
      else if (t.status === "inscripciones_cerradas") upcoming.push(t);
      else if (t.status === "en_curso") active.push(t);
      else if (t.status === "finalizado" || t.status === "cancelado") finished.push(t);
    }
    return { open, upcoming, active, finished };
  }, [filtered]);

  return (
    <div className="min-h-screen bg-gradient-warm pb-28">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-md items-center gap-3 px-5 py-4">
          <Link
            to="/"
            className="flex h-9 w-9 items-center justify-center rounded-2xl border border-border bg-card text-muted-foreground hover:text-foreground"
            aria-label="Volver al inicio"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex-1">
            <h1 className="font-display text-xl font-semibold">Torneos</h1>
            <p className="text-xs text-muted-foreground">Inscripciones y resultados del club</p>
          </div>
          <div className="flex items-center gap-1.5">
            <NotificationCenter />
            {isAdmin && (
              <Link
                to="/admin/torneos"
                className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-muted"
              >
                Admin
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-md space-y-3 px-5 pt-4">
        <div className="space-y-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar torneo por nombre"
              className="h-10 rounded-2xl pl-9"
              aria-label="Buscar torneo"
            />
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <Filter className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            {([
              { v: "todas", l: "Todas" },
              { v: "tenis_singles", l: "Singles" },
              { v: "tenis_dobles", l: "Dobles" },
            ] as const).map((opt) => (
              <button
                key={opt.v}
                type="button"
                onClick={() => setDiscipline(opt.v)}
                className={cn(
                  "shrink-0 rounded-full border px-3 py-1 text-[11px] font-medium transition-smooth",
                  discipline === opt.v
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:text-foreground",
                )}
              >
                {opt.l}
              </button>
            ))}
          </div>
        </div>

        <Tabs defaultValue="open" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="open" className="text-xs">
              Abiertos ({grouped.open.length})
            </TabsTrigger>
            <TabsTrigger value="active" className="text-xs">
              En curso ({grouped.active.length})
            </TabsTrigger>
            <TabsTrigger value="upcoming" className="text-xs">
              Próximos ({grouped.upcoming.length})
            </TabsTrigger>
            <TabsTrigger value="finished" className="text-xs">
              Pasados ({grouped.finished.length})
            </TabsTrigger>
          </TabsList>

          {(["open", "active", "upcoming", "finished"] as const).map((key) => (
            <TabsContent key={key} value={key} className="mt-4 space-y-3">
              {loading ? (
                <>
                  <TournamentCardSkeleton />
                  <TournamentCardSkeleton />
                  <TournamentCardSkeleton />
                </>
              ) : grouped[key].length === 0 ? (
                <EmptyState
                  icon={Trophy}
                  title="Sin torneos"
                  description={
                    search || discipline !== "todas"
                      ? "Sin coincidencias para los filtros aplicados."
                      : key === "open"
                        ? "No hay inscripciones abiertas en este momento."
                        : key === "active"
                          ? "Ningún torneo en curso."
                          : key === "upcoming"
                            ? "Sin torneos próximos."
                            : "Aún no hay torneos pasados."
                  }
                />
              ) : (
                grouped[key].map((t) => <TournamentCard key={t.id} tournament={t} />)
              )}
            </TabsContent>
          ))}
        </Tabs>
      </main>

      <BottomNav />
    </div>
  );
};

const TournamentCard = ({ tournament }: { tournament: Tournament }) => {
  const status = tournament.status as TournamentStatus;
  const cats = tournament.tournament_categories ?? [];
  const totalCupo = cats.reduce((sum, c) => sum + c.max_participants, 0);
  return (
    <Link
      to={`/torneos/${tournament.slug}`}
      className="block rounded-3xl border border-border bg-card p-4 shadow-card transition-smooth hover:-translate-y-0.5"
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <h3 className="font-display text-base font-semibold leading-tight">{tournament.name}</h3>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${tournamentStatusColor(status)}`}
        >
          {TOURNAMENT_STATUS_LABEL[status]}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        {cats.length === 0
          ? "Sin categorías aún"
          : cats.length === 1
            ? cats[0].name
            : `${cats.length} categorías`}
      </p>
      <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Calendar className="h-3.5 w-3.5" />
          {format(parseISO(tournament.starts_at), "d MMM", { locale: es })}
        </span>
        {totalCupo > 0 && (
          <span className="flex items-center gap-1">
            <Layers className="h-3.5 w-3.5" />
            Cupo total {totalCupo}
          </span>
        )}
      </div>
    </Link>
  );
};

export default Torneos;
