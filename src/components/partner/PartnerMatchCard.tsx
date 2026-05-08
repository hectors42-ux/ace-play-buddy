import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { PartnerSuggestion } from "@/hooks/usePartnerSuggestions";

const initials = (a?: string | null, b?: string | null) =>
  `${a?.[0] ?? ""}${b?.[0] ?? ""}`.toUpperCase() || "?";

interface BreakdownRow {
  label: string;
  value: number; // 0-100
  hint: string;
}

const BAR_COLORS = (v: number) =>
  v >= 75 ? "bg-success" : v >= 50 ? "bg-primary" : "bg-warning";

interface Props {
  partner: PartnerSuggestion;
  commonSlots?: string[];
}

/**
 * Tarjeta ink-dark con halo arcilla, FitRing grande y breakdown de compatibilidad.
 * Estética editorial — referencia imagen 17.
 */
export const PartnerMatchCard = ({ partner, commonSlots = [] }: Props) => {
  const score = partner.compat_score ?? 0;
  const ring = 84;
  const r = (ring - 6) / 2;
  const c = 2 * Math.PI * r;
  const dash = (Math.max(0, Math.min(100, score)) / 100) * c;

  // Breakdown derivado del score (placeholder mientras el RPC no devuelve detalles)
  const levelMatch = partner.level_diff != null ? Math.max(0, 100 - Math.abs(partner.level_diff) * 30) : 70;
  const breakdown: BreakdownRow[] = [
    { label: "Nivel", value: Math.round(levelMatch), hint: levelMatch >= 80 ? "Excelente" : levelMatch >= 60 ? "Compatible" : "Disparejo" },
    { label: "Horarios", value: commonSlots.length > 0 ? Math.min(100, 50 + commonSlots.length * 10) : 60, hint: commonSlots.length > 2 ? "Compatible" : "Parcial" },
    { label: "Frecuencia", value: 70, hint: "Activo" },
    { label: "Historial", value: 50, hint: "Nuevo" },
    { label: "Edad", value: 80, hint: "Cercana" },
  ];

  return (
    <div className="relative overflow-hidden rounded-3xl border border-border/40 bg-[hsl(var(--ink-dark))] p-4 text-[hsl(var(--cream-0))] shadow-2xl">
      {/* Halo radial arcilla */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 30%, hsl(var(--primary) / 0.35) 0%, transparent 60%)",
        }}
      />

      <div className="relative">
        {/* Header con avatar + ring lateral */}
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12 ring-2 ring-primary/40 ring-offset-2 ring-offset-[hsl(var(--ink-dark))]">
            <AvatarImage src={partner.avatar_url ?? undefined} />
            <AvatarFallback className="bg-[hsl(var(--cream-2))] text-[hsl(var(--ink-dark))]">
              {initials(partner.first_name, partner.last_name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-base font-semibold leading-tight tracking-tight">
              {partner.first_name} {partner.last_name}
            </p>
            <p className="mt-0.5 text-[11px] text-[hsl(var(--cream-0))]/60">
              UTR {partner.level?.toFixed(2) ?? "—"}
              {partner.level_diff != null && ` · Δ ${partner.level_diff.toFixed(2)}`}
            </p>
          </div>
          <div className="relative shrink-0" style={{ width: ring, height: ring }}>
            <svg width={ring} height={ring} className="-rotate-90">
              <circle
                cx={ring / 2}
                cy={ring / 2}
                r={r}
                fill="none"
                strokeWidth={4}
                className="stroke-[hsl(var(--cream-0))]/15"
              />
              <circle
                cx={ring / 2}
                cy={ring / 2}
                r={r}
                fill="none"
                strokeWidth={4}
                strokeLinecap="round"
                strokeDasharray={`${dash} ${c - dash}`}
                className="stroke-primary transition-all"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
              <span className="font-display text-2xl font-semibold text-primary">
                {Math.round(score)}
              </span>
              <span className="text-[8px] uppercase tracking-[0.2em] text-[hsl(var(--cream-0))]/60">
                fit
              </span>
            </div>
          </div>
        </div>

        {/* Breakdown */}
        <div className="mt-4 space-y-1.5">
          {breakdown.map((b) => (
            <div key={b.label} className="grid grid-cols-[60px,1fr,auto] items-center gap-2.5">
              <span className="text-[10px] uppercase tracking-wider text-[hsl(var(--cream-0))]/60">
                {b.label}
              </span>
              <div className="h-1 overflow-hidden rounded-full bg-[hsl(var(--cream-0))]/15">
                <div className={`h-full ${BAR_COLORS(b.value)}`} style={{ width: `${b.value}%` }} />
              </div>
              <span className="text-[10px] text-[hsl(var(--cream-0))]/70">{b.hint}</span>
            </div>
          ))}
        </div>

        {/* Horarios en común */}
        {commonSlots.length > 0 && (
          <div className="mt-5">
            <p className="mb-2 text-[10px] uppercase tracking-wider text-[hsl(var(--cream-0))]/60">
              Horarios en común
            </p>
            <div className="flex flex-wrap gap-1.5">
              {commonSlots.slice(0, 4).map((s) => (
                <span
                  key={s}
                  className="rounded-full border border-primary/40 bg-primary/15 px-2.5 py-1 text-[10px] font-medium text-[hsl(var(--cream-0))]"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
