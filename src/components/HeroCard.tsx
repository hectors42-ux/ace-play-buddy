import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles, ArrowRight, CalendarCheck, Clock, User, AlertTriangle } from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import heroCourts480 from "@/assets/hero-courts-480.webp";
import heroCourts768 from "@/assets/hero-courts-768.webp";
import heroCourts1200 from "@/assets/hero-courts-1200.webp";
import heroCourtsJpg from "@/assets/hero-courts-768.jpg";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/providers/AuthProvider";
import { dayLabel } from "@/lib/booking-utils";

// Tiny base64 placeholder (LQIP) shown blurred while the real image loads
const HERO_LQIP =
  "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDABQODxIPDRQSEBIXFRQYHjIhHhwcHj0sLiQySUBMS0dARkVQWnNiUFVtVkVGZIhlbXd7gYKBTmCNl4x9lnN+gXz/2wBDARUXFx4aHjshITt8U0ZTfHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHz/wAARCAAVACADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwCaLT7YIjAFjuJ3BiM5GD36f4VIbeaNBHaztAo5DN8+c9ufSpbWLNvuMhwRuUKoGM9un609laOQAbnDYycDj/GsJ05xVzZVaUtLEBWZZYoQ7EbNzyCQgnt05qwEKgHzpTj/AOutMGWugRlf3Pcf7VSjPdhj6VEm1KzNIqLhdF6OwEcIAkyAuOV61QtHS82kxhCzDnr06dqKK3qN2XqciSTJJINlxu3Z+XZ0x70mMUUVi1dnTFu1j//Z";

const DUES_CHIP_LABEL: Record<string, string> = {
  al_dia: "Cuota al día",
  pendiente: "Cuota pendiente",
  moroso: "Cuota morosa",
  suspendido: "Cuenta suspendida",
};

interface NextBooking {
  id: string;
  starts_at: string;
  ends_at: string;
  court_name: string | null;
  other_first_name: string | null;
  other_last_name: string | null;
  i_am_owner: boolean;
}

export const HeroCard = () => {
  const { user, profile, isCoach } = useAuth();
  const [next, setNext] = useState<NextBooking | null>(null);
  const [loading, setLoading] = useState(true);

  // Los coaches no son socios → no aplican cuotas, ocultar el chip
  const dues = profile?.dues_status ?? "al_dia";
  const duesAtDay = dues === "al_dia";
  const duesLabel = DUES_CHIP_LABEL[dues] ?? "Cuota al día";
  const DuesIcon = duesAtDay ? Sparkles : AlertTriangle;
  const duesChipClass = duesAtDay
    ? "bg-white/15 text-white"
    : "bg-destructive text-destructive-foreground";
  const showDuesChip = !isCoach;

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    let cancel = false;
    (async () => {
      const { data } = await supabase.rpc("my_upcoming_bookings", { _limit: 1 });
      if (cancel) return;
      const row = (data ?? [])[0] as NextBooking | undefined;
      setNext(row ?? null);
      setLoading(false);
    })();
    return () => {
      cancel = true;
    };
  }, [user]);

  const partnerName = next?.other_first_name
    ? `${next.other_first_name} ${(next.other_last_name ?? "").charAt(0)}.`
    : null;
  const start = next ? parseISO(next.starts_at) : null;
  const end = next ? parseISO(next.ends_at) : null;

  return (
    <section className="px-5">
      <div className="relative overflow-hidden rounded-[28px] shadow-elevated">
        {/* LQIP placeholder, blurred while real image loads */}
        <img
          src={HERO_LQIP}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full scale-110 object-cover blur-xl"
        />
        <picture>
          <source
            type="image/webp"
            srcSet={`${heroCourts480} 480w, ${heroCourts768} 768w, ${heroCourts1200} 1200w`}
            sizes="(max-width: 640px) 100vw, 640px"
          />
          <img
            src={heroCourtsJpg}
            alt="Vista aérea de las canchas del club"
            width={924}
            height={616}
            loading="eager"
            decoding="async"
            // @ts-expect-error fetchpriority is valid HTML but missing from React types in this version
            fetchpriority="high"
            className="absolute inset-0 h-full w-full object-cover animate-in fade-in duration-500"
          />
        </picture>
        <div className="absolute inset-0 bg-gradient-overlay" />
        <div className="absolute inset-0 bg-gradient-to-br from-primary-deep/50 via-transparent to-transparent" />

        <div className="relative flex min-h-[260px] flex-col justify-end gap-4 p-6">
          {loading ? (
            <div className="h-24 animate-pulse rounded-2xl bg-white/10" />
          ) : next && start && end ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex w-fit items-center gap-1.5 rounded-full bg-success/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-success-foreground backdrop-blur-md">
                  <CalendarCheck className="h-3 w-3" strokeWidth={2.6} />
                  {next.i_am_owner ? "Tu próxima reserva" : "Te invitaron a jugar"}
                </div>
                {showDuesChip && (
                  <div className={`inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider backdrop-blur-md ${duesChipClass}`}>
                    <DuesIcon className="h-3 w-3" strokeWidth={2.5} />
                    {duesLabel}
                  </div>
                )}
              </div>

              <div className="space-y-1.5 text-white">
                <h1 className="font-display text-3xl font-semibold leading-[1.05] tracking-tight">
                  {next.court_name ?? "Cancha"}
                </h1>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/90">
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" strokeWidth={2.4} />
                    {dayLabel(start)} · {format(start, "HH:mm")}—{format(end, "HH:mm")}
                  </span>
                  {partnerName && (
                    <span className="inline-flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5" strokeWidth={2.4} />
                      {next.i_am_owner ? "Con " : "Invita "}{partnerName}
                    </span>
                  )}
                </div>
              </div>

              <Link to="/reservar" className="w-fit">
                <Button variant="clay" size="lg" aria-label="Ver mis reservas">
                  Ver detalle
                  <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
                </Button>
              </Link>
            </>
          ) : (
            <>
              {showDuesChip && (
                <div className={`inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider backdrop-blur-md ${duesChipClass}`}>
                  <DuesIcon className="h-3 w-3" strokeWidth={2.5} />
                  {duesLabel}
                </div>
              )}
              <div className="space-y-1 text-white">
                <h1 className="font-display text-3xl font-semibold leading-[1.05] tracking-tight">
                  La cancha
                  <br />
                  te espera.
                </h1>
                <p className="max-w-[24ch] text-sm text-white/85">
                  Reserva con un compañero y bloquea tu horario.
                </p>
              </div>
              <Link to="/reservar" className="w-fit">
                <Button variant="clay" size="lg" aria-label="Reservar cancha ahora">
                  Reservar ahora
                  <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </section>
  );
};
