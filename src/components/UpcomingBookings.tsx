import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar, Clock, MapPin, ChevronRight, CalendarPlus, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/providers/AuthProvider";
import { dayLabel } from "@/lib/booking-utils";

interface UpcomingRow {
  id: string;
  starts_at: string;
  ends_at: string;
  court_name: string | null;
  court_surface: string | null;
  other_first_name: string | null;
  other_last_name: string | null;
  i_am_owner: boolean;
}

export const UpcomingBookings = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<UpcomingRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase.rpc("my_upcoming_bookings", { _limit: 3 });
      setBookings(((data ?? []) as unknown) as UpcomingRow[]);
      setLoading(false);
    };
    load();
  }, [user]);

  return (
    <section aria-labelledby="reservas-titulo" className="px-5">
      <div className="mb-3 flex items-center justify-between">
        <h2
          id="reservas-titulo"
          className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground"
        >
          Próximas reservas
        </h2>
        <Link
          to="/reservar"
          className="flex items-center gap-1 text-xs font-medium text-primary transition-smooth hover:gap-1.5"
        >
          Reservar <ChevronRight className="h-3.5 w-3.5" strokeWidth={2.5} />
        </Link>
      </div>

      {loading ? (
        <div className="h-32 animate-pulse rounded-3xl bg-muted" />
      ) : bookings.length === 0 ? (
        <Link
          to="/reservar"
          className="flex items-center gap-3 rounded-3xl border border-dashed border-border bg-card/60 p-4 text-sm text-muted-foreground transition-smooth hover:border-primary hover:bg-card"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <CalendarPlus className="h-5 w-5" />
          </span>
          <div>
            <p className="font-medium text-foreground">Sin reservas próximas</p>
            <p className="text-xs">Toca para reservar tu próxima cancha</p>
          </div>
        </Link>
      ) : (
        <div className="-mx-5 overflow-x-auto scrollbar-none">
          <div className="flex snap-x snap-mandatory gap-3 px-5 pb-1">
            {bookings.map((b, i) => {
              const start = parseISO(b.starts_at);
              const end = parseISO(b.ends_at);
              const partnerName = b.other_first_name
                ? `${b.other_first_name} ${(b.other_last_name ?? "").charAt(0)}.`
                : null;
              return (
                <Link
                  to="/reservar"
                  key={b.id}
                  style={{ animationDelay: `${i * 80}ms` }}
                  className="group relative block w-[78%] shrink-0 snap-start animate-fade-in-up overflow-hidden rounded-3xl border border-border bg-card p-4 shadow-card transition-smooth hover:shadow-elevated"
                >
                  <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-clay opacity-[0.08] blur-xl transition-smooth group-hover:opacity-20" />
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-success">
                        <span className="h-1.5 w-1.5 rounded-full bg-success animate-shimmer" />
                        {b.i_am_owner ? "Confirmada" : "Te invitaron"}
                      </div>
                      <h3 className="font-display text-lg font-semibold leading-tight text-foreground">
                        {b.court_name ?? "Cancha"}
                      </h3>
                      <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                        <p className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" strokeWidth={2.2} />
                          {dayLabel(start)} · {format(start, "d 'de' MMM", { locale: es })}
                        </p>
                        <p className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5" strokeWidth={2.2} />
                          {format(start, "HH:mm")} — {format(end, "HH:mm")}
                        </p>
                        <p className="flex items-center gap-1.5 capitalize">
                          <MapPin className="h-3.5 w-3.5" strokeWidth={2.2} />
                          {b.court_surface ?? "—"}
                        </p>
                        {partnerName && (
                          <p className="flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5" strokeWidth={2.2} />
                            {b.i_am_owner ? "Con " : "Te invita "}{partnerName}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
};
