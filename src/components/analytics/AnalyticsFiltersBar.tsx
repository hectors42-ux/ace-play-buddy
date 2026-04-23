import { CalendarRange } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAnalyticsFilters, type DateRangePreset } from "@/hooks/analytics/useAnalyticsFilters";
import { cn } from "@/lib/utils";

const PRESETS: Array<{ value: DateRangePreset; label: string }> = [
  { value: "7d", label: "7d" },
  { value: "30d", label: "30d" },
  { value: "mtd", label: "MTD" },
  { value: "90d", label: "90d" },
  { value: "ytd", label: "YTD" },
];

export function AnalyticsFiltersBar() {
  const { preset, setPreset, from, to } = useAnalyticsFilters();
  const fmt = (d: Date) => d.toLocaleDateString("es-CL", { day: "2-digit", month: "short" });

  return (
    <div className="-mx-4 flex items-center gap-2 overflow-x-auto border-b border-border/60 bg-muted/30 px-4 py-2 md:-mx-6 md:px-6">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <CalendarRange className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">{fmt(from)} → {fmt(to)}</span>
      </div>
      <div className="ml-auto flex items-center gap-1">
        {PRESETS.map((p) => (
          <Button
            key={p.value}
            size="sm"
            variant={preset === p.value ? "default" : "ghost"}
            onClick={() => setPreset(p.value)}
            className={cn("h-7 px-2.5 text-xs", preset === p.value && "shadow-sm")}
          >
            {p.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
