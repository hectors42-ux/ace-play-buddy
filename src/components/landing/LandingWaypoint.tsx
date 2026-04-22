interface LandingWaypointProps {
  word: string;
  subtitle?: string;
  variant?: "light" | "dark";
  /** id para anchor scroll opcional. */
  id?: string;
}

/**
 * Sección "wayfinding": tipografía gigante a pantalla completa.
 * Actúa como portal/transición entre secciones.
 */
export const LandingWaypoint = ({
  word,
  subtitle,
  variant = "light",
  id,
}: LandingWaypointProps) => {
  const isDark = variant === "dark";
  return (
    <section
      id={id}
      className={`relative overflow-hidden ${
        isDark ? "bg-ink-dark text-cream-0" : "bg-cream-0 text-ink-dark"
      }`}
    >
      <div className="mx-auto max-w-[1600px] px-5 md:px-8 py-24 md:py-40 flex flex-col items-center justify-center text-center">
        {subtitle && (
          <p
            className={`reveal label-eyebrow mb-6 ${
              isDark ? "text-primary-glow" : "text-clay-deep"
            }`}
          >
            {subtitle}
          </p>
        )}
        <h2
          className="reveal font-display font-semibold leading-[0.85] tracking-tight"
          style={{ fontSize: "clamp(4rem, 18vw, 16rem)", letterSpacing: "-0.04em" }}
        >
          {word}
        </h2>
        <div
          className={`reveal mt-10 h-px w-24 ${
            isDark ? "bg-cream-0/30" : "bg-clay-deep/40"
          }`}
        />
      </div>
    </section>
  );
};

export default LandingWaypoint;
