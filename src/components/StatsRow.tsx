import { TrendingUp, Activity, Award } from "lucide-react";

const stats = [
  { label: "Tu nivel", value: "3.5", icon: TrendingUp, hint: "+0.2 este mes" },
  { label: "Horas jugadas", value: "24", icon: Activity, hint: "Abril" },
  { label: "Ranking club", value: "#42", icon: Award, hint: "↑ 5 posiciones" },
];

export const StatsRow = () => {
  return (
    <section aria-label="Tus estadísticas" className="px-5">
      <div className="grid grid-cols-3 gap-2.5">
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
              style={{ animationDelay: `${i * 50}ms` }}
              className="animate-scale-in rounded-2xl border border-border bg-card p-3 shadow-card"
            >
              <Icon
                className="mb-2 h-4 w-4 text-primary"
                strokeWidth={2.4}
              />
              <p className="font-display text-xl font-semibold leading-none text-foreground">
                {s.value}
              </p>
              <p className="mt-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                {s.label}
              </p>
              <p className="mt-1 text-[10px] text-success">{s.hint}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
};
