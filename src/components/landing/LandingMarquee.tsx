import { Fragment } from "react";

interface LandingMarqueeProps {
  items: string[];
  variant?: "light" | "dark";
  /** Velocidad en segundos para una vuelta completa. Mayor = más lento. */
  speed?: number;
}

/**
 * Marquee horizontal infinito (CSS-only). Pausa al hover.
 * Usa keyframes `marquee` definidos en index.css.
 */
export const LandingMarquee = ({ items, variant = "light", speed = 40 }: LandingMarqueeProps) => {
  const isDark = variant === "dark";
  return (
    <section
      aria-hidden="true"
      className={`relative overflow-hidden border-y ${
        isDark
          ? "bg-ink-dark text-cream-0 border-ink-dark"
          : "bg-cream-0 text-clay-deep border-cream-2"
      }`}
    >
      <div
        className="flex w-max animate-[marquee_var(--marquee-speed)_linear_infinite] hover:[animation-play-state:paused] motion-reduce:animate-none will-change-transform"
        style={{ ["--marquee-speed" as string]: `${speed}s` }}
      >
        {[0, 1].map((dup) => (
          <Fragment key={dup}>
            {items.map((item, i) => (
              <span
                key={`${dup}-${i}`}
                className="flex items-center gap-8 px-8 py-5 md:py-7 font-display text-2xl md:text-4xl font-semibold whitespace-nowrap"
              >
                {item}
                <span className={`inline-block h-1.5 w-1.5 rounded-full ${isDark ? "bg-primary-glow" : "bg-clay-deep"}`} />
              </span>
            ))}
          </Fragment>
        ))}
      </div>
    </section>
  );
};

export default LandingMarquee;
