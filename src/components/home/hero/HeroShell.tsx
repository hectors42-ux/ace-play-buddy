import { ReactNode } from "react";
import { Sparkles, AlertTriangle } from "lucide-react";
import heroCourts480 from "@/assets/hero-courts-480.webp";
import heroCourts768 from "@/assets/hero-courts-768.webp";
import heroCourts1200 from "@/assets/hero-courts-1200.webp";
import heroCourtsJpg from "@/assets/hero-courts-768.jpg";
import { useAuth } from "@/components/providers/AuthProvider";

const HERO_LQIP =
  "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDABQODxIPDRQSEBIXFRQYHjIhHhwcHj0sLiQySUBMS0dARkVQWnNiUFVtVkVGZIhlbXd7gYKBTmCNl4x9lnN+gXz/2wBDARUXFx4aHjshITt8U0ZTfHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHz/wAARCAAVACADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwCaLT7YIjAFjuJ3BiM5GD36f4VIbeaNBHaztAo5DN8+c9ufSpbWLNvuMhwRuUKoGM9un609laOQAbnDYycDj/GsJ05xVzZVaUtLEBWZZYoQ7EbNzyCQgnt05qwEKgHzpTj/AOutMGWugRlf3Pcf7VSjPdhj6VEm1KzNIqLhdF6OwEcIAkyAuOV61QtHS82kxhCzDnr06dqKK3qN2XqciSTJJINlxu3Z+XZ0x70mMUUVi1dnTFu1j//Z";

const DUES_CHIP_LABEL: Record<string, string> = {
  al_dia: "Cuota al día",
  pendiente: "Cuota pendiente",
  moroso: "Cuota morosa",
  suspendido: "Cuenta suspendida",
};

/**
 * Carcasa común de todos los heros del Home: fondo aéreo, overlay clay,
 * chip de cuotas y slot para contenido. Garantiza consistencia visual entre
 * HeroBookingNext / HeroTournament / HeroMatchupOfTheWeek / HeroSuggestedRival / HeroIdle.
 */
export const HeroShell = ({ children }: { children: ReactNode }) => {
  const { profile, isCoach } = useAuth();
  const dues = profile?.dues_status ?? "al_dia";
  const duesAtDay = dues === "al_dia";
  const duesLabel = DUES_CHIP_LABEL[dues] ?? "Cuota al día";
  const DuesIcon = duesAtDay ? Sparkles : AlertTriangle;
  const duesChipClass = duesAtDay
    ? "bg-white/15 text-white"
    : "bg-destructive text-destructive-foreground";
  const showDuesChip = !isCoach;

  return (
    <section className="px-5">
      <div className="relative overflow-hidden rounded-[14px] shadow-elevated">
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
            // @ts-expect-error fetchpriority is valid HTML but missing from React types
            fetchpriority="high"
            className="absolute inset-0 h-full w-full object-cover animate-in fade-in duration-500"
          />
        </picture>
        <div className="absolute inset-0 bg-gradient-overlay" />
        <div className="absolute inset-0 bg-gradient-to-br from-primary-deep/50 via-transparent to-transparent" />

        <div className="relative flex min-h-[260px] flex-col justify-end gap-4 p-6 md:min-h-[300px] md:p-8">
          {showDuesChip && (
            <div className="absolute right-5 top-5">
              <div
                className={`inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider backdrop-blur-md ${duesChipClass}`}
              >
                <DuesIcon className="h-3 w-3" strokeWidth={2.5} />
                {duesLabel}
              </div>
            </div>
          )}
          {children}
        </div>
      </div>
    </section>
  );
};

export const HeroSkeleton = () => (
  <HeroShell>
    <div className="h-24 animate-pulse rounded-2xl bg-white/10" />
  </HeroShell>
);
