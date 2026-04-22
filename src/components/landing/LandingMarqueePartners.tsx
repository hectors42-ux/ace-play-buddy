import { Fragment } from "react";
import { PARTNERS, type PartnerItem } from "./LandingPartners";

interface LandingMarqueePartnersProps {
  partners?: PartnerItem[];
  variant?: "light" | "dark";
  /** Velocidad en segundos para una vuelta completa. Mayor = más lento. */
  speed?: number;
}

/**
 * Marquee horizontal infinito con logos clicables de partners.
 * Reutiliza los keyframes `marquee` de index.css. Pausa al hover.
 */
export const LandingMarqueePartners = ({
  partners = PARTNERS,
  variant = "light",
  speed = 50,
}: LandingMarqueePartnersProps) => {
  const isDark = variant === "dark";

  return (
    <section
      aria-label="Partners del Club de Tenis Providencia"
      className={`relative overflow-hidden border-y ${
        isDark
          ? "bg-ink-dark border-ink-dark"
          : "bg-cream-0 border-cream-2"
      }`}
    >
      <div
        className="flex w-max animate-[marquee_var(--marquee-speed)_linear_infinite] hover:[animation-play-state:paused] motion-reduce:animate-none will-change-transform"
        style={{ ["--marquee-speed" as string]: `${speed}s` }}
      >
        {[0, 1].map((dup) => (
          <Fragment key={dup}>
            {partners.map((p, i) => (
              <a
                key={`${dup}-${i}-${p.name}`}
                href={p.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Visitar ${p.name}`}
                className="group flex items-center gap-6 px-8 md:px-12 py-6 md:py-8 shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
              >
                {p.logo ? (
                  <img
                    src={p.logo}
                    alt={p.name}
                    loading="lazy"
                    width={160}
                    height={80}
                    className={`h-10 md:h-12 w-auto object-contain transition-all duration-300 ${
                      isDark
                        ? "opacity-80 brightness-0 invert group-hover:opacity-100"
                        : "opacity-70 grayscale group-hover:opacity-100 group-hover:grayscale-0"
                    } group-hover:scale-105`}
                  />
                ) : (
                  <span
                    className={`font-display text-base md:text-lg uppercase tracking-[0.2em] whitespace-nowrap transition-colors ${
                      isDark
                        ? "text-cream-1/70 group-hover:text-cream-0"
                        : "text-ink-soft group-hover:text-clay-deep"
                    }`}
                  >
                    {p.name}
                  </span>
                )}
                <span
                  aria-hidden="true"
                  className={`inline-block h-1.5 w-1.5 rounded-full ${
                    isDark ? "bg-primary-glow" : "bg-clay-deep/60"
                  }`}
                />
              </a>
            ))}
          </Fragment>
        ))}
      </div>
    </section>
  );
};

export default LandingMarqueePartners;
