interface LandingSealProps {
  size?: number;
  text?: string;
  /** Color del texto curvo: usa tokens (ej: "text-cream-0", "text-clay-deep"). */
  className?: string;
  /** Mostrar año/inicial central. */
  centerLabel?: string;
  /** Color del label central (ej: "text-gold"). */
  labelClassName?: string;
}

/**
 * Sello circular giratorio con texto curvo (textPath).
 * Decorativo. Animación pausa con prefers-reduced-motion.
 */
export const LandingSeal = ({
  size = 160,
  text = "CLUB DE TENIS PROVIDENCIA · DESDE 1975 · ",
  className = "text-clay-deep",
  centerLabel = "50",
  labelClassName = "",
}: LandingSealProps) => {
  // Repetir el texto para llenar la circunferencia bien
  const fullText = text.repeat(2);
  const id = `seal-path-${Math.random().toString(36).slice(2, 8)}`;

  return (
    <div
      aria-hidden="true"
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 200 200"
        className="absolute inset-0 h-full w-full animate-[spin_40s_linear_infinite] motion-reduce:animate-none will-change-transform"
      >
        <defs>
          <path
            id={id}
            d="M 100,100 m -78,0 a 78,78 0 1,1 156,0 a 78,78 0 1,1 -156,0"
          />
        </defs>
        <text
          fill="currentColor"
          style={{ fontFamily: "'Fraunces', serif", fontSize: "13px", letterSpacing: "0.18em" }}
        >
          <textPath href={`#${id}`}>{fullText}</textPath>
        </text>
      </svg>
      <div className="flex flex-col items-center justify-center">
        <span
          className={`font-display font-semibold leading-none ${labelClassName}`}
          style={{ fontSize: size * 0.28 }}
        >
          {centerLabel}
        </span>
        <span className="mt-1 text-[9px] uppercase tracking-[0.25em] opacity-70">años</span>
      </div>
    </div>
  );
};

export default LandingSeal;
