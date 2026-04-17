import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar, Clock, MapPin, ChevronRight, CalendarPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/providers/AuthProvider";
import { dayLabel } from "@/lib/booking-utils";

interface BookingWithCourt {
  id: string;
  starts_at: string;
  ends_at: string;
  courts: { name: string; surface: string } | null;
}

export const UpcomingBookings = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<BookingWithCourt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("bookings")
        .select("id, starts_at, ends_at, courts(name, surface)")
        .eq("user_id", user.id)
        .eq("status", "confirmada")
        .gte("ends_at", new Date().toISOString())
        .order("starts_at", { ascending: true })
        .limit(3);
      setBookings((data ?? []) as unknown as BookingWithCourt[]);
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
        <div className="space-y-3">
          {bookings.map((b, i) => {
            const start = parseISO(b.starts_at);
            const end = parseISO(b.ends_at);
            return (
              <Link
                to="/reservar"
                key={b.id}
                style={{ animationDelay: `${i * 80}ms` }}
                className="group relative block animate-fade-in-up overflow-hidden rounded-3xl border border-border bg-card p-4 shadow-card transition-smooth hover:shadow-elevated"
              >
                <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-clay opacity-[0.08] blur-xl transition-smooth group-hover:opacity-20" />
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-success">
                      <span className="h-1.5 w-1.5 rounded-full bg-success animate-shimmer" />
                      Confirmada
                    </div>
                    <h3 className="font-display text-lg font-semibold leading-tight text-foreground">
                      {b.courts?.name ?? "Cancha"}
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
                        {b.courts?.surface ?? "—"}
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
};
