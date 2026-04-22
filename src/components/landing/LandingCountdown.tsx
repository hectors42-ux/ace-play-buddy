import { useEffect, useState } from "react";

interface LandingCountdownProps {
  /** Fecha objetivo (ISO 8601). */
  targetDate: string;
  eyebrow?: string;
  title: string;
  subtitle?: string;
}

const compute = (target: number) => {
  const now = Date.now();
  const diff = Math.max(0, target - now);
  const d = Math.floor(diff / 86_400_000);
  const h = Math.floor((diff % 86_400_000) / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1000);
  return { d, h, m, s };
};

const pad = (n: number) => n.toString().padStart(2, "0");

/**
 * Countdown editorial hacia un evento futuro. Cliente-only.
 */
export const LandingCountdown = ({
  targetDate,
  eyebrow = "Próximo evento",
  title,
  subtitle,
}: LandingCountdownProps) => {
  const target = new Date(targetDate).getTime();
  const [t, setT] = useState(() => compute(target));

  useEffect(() => {
    const id = setInterval(() => setT(compute(target)), 1000);
    return () => clearInterval(id);
  }, [target]);

  const cells: Array<[string, string]> = [
    [pad(t.d), "Días"],
    [pad(t.h), "Horas"],
    [pad(t.m), "Min"],
    [pad(t.s), "Seg"],
  ];

  return (
    <section className="bg-cream-1 border-y border-cream-2 py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-5 md:px-8 grid md:grid-cols-2 gap-10 md:gap-16 items-center">
        <div className="reveal">
          <p className="label-eyebrow mb-4">{eyebrow}</p>
          <h2 className="font-display text-4xl md:text-5xl font-semibold leading-[1.05] text-ink-dark">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-5 text-ink-muted text-base md:text-lg leading-relaxed max-w-md">
              {subtitle}
            </p>
          )}
        </div>
        <div
          className="reveal grid grid-cols-4 gap-3 md:gap-5"
          aria-label={`Cuenta regresiva: ${t.d} días ${t.h} horas ${t.m} minutos ${t.s} segundos`}
          role="timer"
        >
          {cells.map(([num, label]) => (
            <div
              key={label}
              className="bg-cream-0 border border-cream-3 rounded-sm py-5 md:py-7 px-2 text-center"
            >
              <p
                className="font-display font-semibold text-clay-deep tabular-nums leading-none"
                style={{ fontSize: "clamp(1.75rem, 5vw, 3.5rem)" }}
              >
                {num}
              </p>
              <p className="mt-2 label-eyebrow text-ink-soft text-[10px]">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default LandingCountdown;
