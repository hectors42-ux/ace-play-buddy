import { Calendar, MapPin, Clock, ChevronRight } from "lucide-react";

interface BookingCardProps {
  court: string;
  date: string;
  time: string;
  partner: string;
  partnerInitials: string;
  status: "confirmada" | "pendiente";
}

const upcoming: BookingCardProps[] = [
  {
    court: "Cancha Central",
    date: "Hoy",
    time: "19:00 — 20:30",
    partner: "Con Diego Salinas",
    partnerInitials: "DS",
    status: "confirmada",
  },
  {
    court: "Cancha 3",
    date: "Sábado 19 abr",
    time: "10:00 — 11:30",
    partner: "Open match · 4 jugadores",
    partnerInitials: "+3",
    status: "confirmada",
  },
];

export const UpcomingBookings = () => {
  return (
    <section aria-labelledby="reservas-titulo" className="px-5">
      <div className="mb-3 flex items-center justify-between">
        <h2
          id="reservas-titulo"
          className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground"
        >
          Próximas reservas
        </h2>
        <button className="flex items-center gap-1 text-xs font-medium text-primary transition-smooth hover:gap-1.5">
          Ver todas <ChevronRight className="h-3.5 w-3.5" strokeWidth={2.5} />
        </button>
      </div>

      <div className="space-y-3">
        {upcoming.map((b, i) => (
          <article
            key={i}
            style={{ animationDelay: `${i * 80}ms` }}
            className="group relative animate-fade-in-up overflow-hidden rounded-3xl border border-border bg-card p-4 shadow-card transition-smooth hover:shadow-elevated"
          >
            <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-clay opacity-[0.08] blur-xl transition-smooth group-hover:opacity-20" />

            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-success">
                  <span className="h-1.5 w-1.5 rounded-full bg-success animate-shimmer" />
                  {b.status}
                </div>
                <h3 className="font-display text-lg font-semibold leading-tight text-foreground">
                  {b.court}
                </h3>
                <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                  <p className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" strokeWidth={2.2} />
                    {b.date}
                  </p>
                  <p className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" strokeWidth={2.2} />
                    {b.time}
                  </p>
                  <p className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" strokeWidth={2.2} />
                    {b.partner}
                  </p>
                </div>
              </div>

              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-clay text-sm font-semibold text-primary-foreground shadow-clay">
                {b.partnerInitials}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};
