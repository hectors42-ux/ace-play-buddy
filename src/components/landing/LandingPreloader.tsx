import { useEffect, useState } from "react";

const KEY = "ctp_landing_preloader_v1";
const FROM = 1975;
const TO = 2025;
const DURATION = 1400;

/**
 * Preloader editorial: contador 1975 → 2025 + nombre del club.
 * Solo se muestra una vez por sesión y respeta prefers-reduced-motion.
 */
export const LandingPreloader = () => {
  const [show, setShow] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    if (sessionStorage.getItem(KEY) === "1") return false;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return false;
    return true;
  });
  const [year, setYear] = useState<number>(FROM);
  const [fadingOut, setFadingOut] = useState(false);

  useEffect(() => {
    if (!show) return;
    const start = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / DURATION);
      // ease-out cúbico
      const eased = 1 - Math.pow(1 - t, 3);
      setYear(Math.round(FROM + (TO - FROM) * eased));
      if (t < 1) {
        raf = requestAnimationFrame(step);
      } else {
        sessionStorage.setItem(KEY, "1");
        setFadingOut(true);
        setTimeout(() => setShow(false), 450);
      }
    };
    raf = requestAnimationFrame(step);
    // Bloquea scroll mientras está activo
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      cancelAnimationFrame(raf);
      document.body.style.overflow = prevOverflow;
    };
  }, [show]);

  if (!show) return null;

  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-cream-0 transition-opacity duration-500 ${
        fadingOut ? "opacity-0" : "opacity-100"
      }`}
    >
      <p className="label-eyebrow mb-6 text-clay-deep">Club de Tenis Providencia</p>
      <p
        className="font-display font-semibold text-ink-dark leading-none tabular-nums"
        style={{ fontSize: "clamp(5rem, 22vw, 18rem)", letterSpacing: "-0.04em" }}
      >
        {year}
      </p>
      <div className="mt-8 h-px w-24 bg-clay-deep/40" />
      <p className="mt-6 text-xs uppercase tracking-[0.3em] text-ink-soft">50 años · arcilla viva</p>
    </div>
  );
};

export default LandingPreloader;
