import { useCountUp } from "@/components/feedback";
import { cn } from "@/lib/utils";

interface Props {
  roundLabel: string;
  categoryName: string;
  closed: number;
  total: number;
}

export function RoundProgressCard({ roundLabel, categoryName, closed, total }: Props) {
  const pct = total === 0 ? 0 : Math.round((closed / total) * 100);
  const animClosed = useCountUp(closed, { duration: 700 });

  return (
    <section className="rounded-2xl border border-border bg-gradient-to-br from-card to-muted/30 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-muted-foreground">
            {categoryName}
          </p>
          <h2 className="mt-1 font-display text-2xl font-semibold leading-tight">
            {roundLabel}
          </h2>
        </div>
        <div className="text-right">
          <p className="font-display text-3xl font-semibold tabular-nums text-primary">
            {animClosed}
            <span className="text-base text-muted-foreground">/{total}</span>
          </p>
          <p className="font-mono text-[9px] uppercase tracking-[0.32em] text-muted-foreground">
            canchas cerradas
          </p>
        </div>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all duration-700")}
          style={{ width: `${pct}%`, background: "var(--gradient-clay)" }}
        />
      </div>
    </section>
  );
}