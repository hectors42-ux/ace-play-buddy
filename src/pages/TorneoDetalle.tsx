import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav } from "@/components/BottomNav";
import {
  TOURNAMENT_STATUS_LABEL,
  tournamentStatusColor,
  type TournamentStatus,
} from "@/lib/tournament-utils";
import type { Tables } from "@/integrations/supabase/types";

type Tournament = Tables<"tournaments"> & {
  tournament_categories: Tables<"tournament_categories">[];
};

const TorneoDetalle = () => {
  const { slug } = useParams<{ slug: string }>();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!slug) return;
      const { data } = await supabase
        .from("tournaments")
        .select("*, tournament_categories(*)")
        .eq("slug", slug)
        .maybeSingle();
      setTournament(data as Tournament | null);
      setLoading(false);
    };
    load();
  }, [slug]);

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
        <Link to="/torneos" className="text-sm text-primary underline">
          Volver
        </Link>
      </div>
    );
  }

  const status = tournament.status as TournamentStatus;
  const cats = tournament.tournament_categories ?? [];

  return (
    <div className="min-h-screen bg-gradient-warm pb-28">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-md items-center gap-3 px-5 py-4">
          <Link
            to="/torneos"
            className="flex h-9 w-9 items-center justify-center rounded-2xl border border-border bg-card text-muted-foreground hover:text-foreground"
            aria-label="Volver"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="flex-1 truncate font-display text-lg font-semibold">{tournament.name}</h1>
        </div>
      </header>

      <main className="mx-auto max-w-md space-y-4 px-5 pt-4">
        <section className="rounded-3xl border border-border bg-card p-5 shadow-card">
          <div className="mb-3 flex items-start justify-between gap-2">
            <h2 className="font-display text-xl font-semibold leading-tight">{tournament.name}</h2>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${tournamentStatusColor(status)}`}
            >
              {TOURNAMENT_STATUS_LABEL[status]}
            </span>
          </div>
          {tournament.description && (
            <p className="mb-3 text-sm text-muted-foreground">{tournament.description}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Inicio {format(parseISO(tournament.starts_at), "d MMM yyyy", { locale: es })}
          </p>
        </section>

        <section>
          <h3 className="mb-2 font-display text-sm font-semibold">Categorías</h3>
          {cats.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border bg-card/50 p-6 text-center text-sm text-muted-foreground">
              Aún no hay categorías abiertas.
            </p>
          ) : (
            <div className="space-y-2">
              {cats.map((c) => (
                <Link
                  key={c.id}
                  to={`/torneos/${tournament.slug}/cat/${c.id}`}
                  className="block rounded-2xl border border-border bg-card px-4 py-3 transition-smooth hover:-translate-y-0.5 hover:shadow-card"
                >
                  <p className="text-sm font-semibold">{c.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.discipline === "tenis_dobles" ? "Dobles" : "Singles"} · cupo {c.max_participants}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </section>

      </main>

      <BottomNav />
    </div>
  );
};

export default TorneoDetalle;
