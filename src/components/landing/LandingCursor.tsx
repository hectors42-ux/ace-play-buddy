import { useEffect, useRef, useState } from "react";

/**
 * Cursor custom: punto crema + anillo clay que sigue al puntero.
 * Solo desktop (md+). Se desactiva con prefers-reduced-motion o en touch.
 */
export const LandingCursor = () => {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);
  const [hovering, setHovering] = useState(false);

  useEffect(() => {
    const isDesktop = window.matchMedia("(min-width: 768px) and (pointer: fine)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!isDesktop || reduced) return;
    setEnabled(true);

    let rafId = 0;
    let mx = window.innerWidth / 2;
    let my = window.innerHeight / 2;
    let rx = mx;
    let ry = my;

    const onMove = (e: MouseEvent) => {
      mx = e.clientX;
      my = e.clientY;
      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${mx}px, ${my}px, 0) translate(-50%, -50%)`;
      }
    };

    const tick = () => {
      // lerp para anillo
      rx += (mx - rx) * 0.18;
      ry += (my - ry) * 0.18;
      if (ringRef.current) {
        ringRef.current.style.transform = `translate3d(${rx}px, ${ry}px, 0) translate(-50%, -50%)`;
      }
      rafId = requestAnimationFrame(tick);
    };

    const onOver = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      const interactive = !!t.closest('a, button, [role="button"], input, label, textarea, select, [data-cursor-hover]');
      setHovering(interactive);
    };

    document.body.classList.add("cursor-none-md");
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseover", onOver);
    rafId = requestAnimationFrame(tick);

    return () => {
      document.body.classList.remove("cursor-none-md");
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseover", onOver);
      cancelAnimationFrame(rafId);
    };
  }, []);

  if (!enabled) return null;

  return (
    <>
      {/* Anillo exterior: borde clay con halo crema para verse en cualquier fondo */}
      <div
        ref={ringRef}
        aria-hidden="true"
        className={`pointer-events-none fixed left-0 top-0 z-[90] rounded-full border-2 border-clay-deep shadow-[0_0_0_1px_rgba(255,247,237,0.85)] transition-[width,height,opacity] duration-200 ${
          hovering ? "h-12 w-12 opacity-100" : "h-9 w-9 opacity-90"
        }`}
      />
      {/* Punto interior: clay sólido con borde crema para contraste sobre fondos oscuros */}
      <div
        ref={dotRef}
        aria-hidden="true"
        className="pointer-events-none fixed left-0 top-0 z-[91] h-2.5 w-2.5 rounded-full bg-clay-deep ring-2 ring-cream-0"
      />
    </>
  );
};

export default LandingCursor;
