import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Calendar, Trophy, Users } from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/providers/AuthProvider";
import { BottomNav } from "@/components/BottomNav";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { EmptyState } from "@/components/EmptyState";
import {
  DISCIPLINE_LABEL,
  TOURNAMENT_STATUS_LABEL,
  tournamentStatusColor,
  type TournamentStatus,
} from "@/lib/tournament-utils";
import type { Tables } from "@/integrations/supabase/types";

type Tournament = Tables<"tournaments">;

const Torneos = () => {
  const { isAdmin } = useAuth();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("tournaments")
        .select("*")
        .order("starts_at", { ascending: false });
      setTournaments(data ?? []);
      setLoading(false);
    };
    load();
  }, []);

  const grouped = useMemo(() => {
    const open: Tournament[] = [];
    const upcoming: Tournament[] = [];
    const active: Tournament[] = [];
    const finished: Tournament[] = [];
    for (const t of tournaments) {
      if (t.status === "inscripciones_abiertas") open.push(t);
      else if (t.status === "inscripciones_cerradas") upcoming.push(t);
      else if (t.status === "en_curso") active.push(t);
      else if (t.status === "finalizado" || t.status === "cancelado") finished.push(t);
    }
    return { open, upcoming, active, finished };
  }, [tournaments]);

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
          {isAdmin && (
            <Link
              to="/admin/torneos"
              className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-muted"
            >
              Admin
            </Link>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-md px-5 pt-4">
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
                <p className="text-center text-sm text-muted-foreground">Cargando…</p>
              ) : grouped[key].length === 0 ? (
                <EmptyState
                  icon={Trophy}
                  title="Sin torneos"
                  description={
                    key === "open"
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
        {DISCIPLINE_LABEL[tournament.discipline]} · {tournament.category}
      </p>
      <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Calendar className="h-3.5 w-3.5" />
          {format(parseISO(tournament.starts_at), "d MMM", { locale: es })}
        </span>
        <span className="flex items-center gap-1">
          <Users className="h-3.5 w-3.5" />
          Cupo {tournament.max_participants}
        </span>
      </div>
    </Link>
  );
};

export default Torneos;
