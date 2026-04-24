import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import {
  ArrowRight,
  Filter,
  History,
  Loader2,
  Swords,
  Trophy,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useMatchHistory, type PlayedMatchRow } from "@/hooks/useMatchHistory";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  mode: "own" | "public";
  ownerName?: string;
}

type Filter = "all" | "tournament" | "ladder" | "friendly";

const FILTER_LABEL: Record<Filter, string> = {
  all: "Todos",
  tournament: "Torneos",
  ladder: "Pirámide",
  friendly: "Amistosos",
};

const formatScore = (raw: unknown): string | null => {
  if (!raw) return null;
  if (Array.isArray(raw)) {
    const sets = raw
      .map((s: { a?: number; b?: number }) =>
        typeof s?.a === "number" && typeof s?.b === "number" ? `${s.a}-${s.b}` : null,
      )
      .filter(Boolean);
    return sets.length ? sets.join(", ") : null;
  }
  return null;
};

const sourceToCategory = (source: string): "tournament" | "ladder" | "friendly" | "other" => {
  if (source === "partido_torneo") return "tournament";
  if (source === "desafio_ladder") return "ladder";
  if (source === "amistoso") return "friendly";
  return "other";
};

const sourceBadge = (source: string) => {
  const cat = sourceToCategory(source);
  if (cat === "tournament")
    return { label: "Torneo", icon: Trophy, classes: "bg-primary/15 text-primary" };
  if (cat === "ladder")
    return { label: "Pirámide", icon: Swords, classes: "bg-accent/20 text-accent-foreground" };
  if (cat === "friendly")
    return { label: "Amistoso", icon: History, classes: "bg-muted text-muted-foreground" };
  return { label: "Otro", icon: History, classes: "bg-muted text-muted-foreground" };
};

export const MatchHistorySheet = ({ open, onOpenChange, userId, mode, ownerName }: Props) => {
  const [filter, setFilter] = useState<Filter>("all");
  const { data, isLoading } = useMatchHistory(userId, {
    enabled: open,
    limit: mode === "own" ? 50 : 10,
  });

  const filtered = useMemo(() => {
    const list = data?.played ?? [];
    if (filter === "all") return list;
    return list.filter((m) => sourceToCategory(m.source) === filter);
  }, [data, filter]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[88vh] overflow-hidden p-0">
        <div className="mx-auto flex h-full max-w-md flex-col">
          <SheetHeader className="flex-row items-start justify-between gap-2 border-b border-border p-4 text-left">
            <div>
              <SheetTitle className="font-display text-base">
                {mode === "own" ? "Historial de partidos" : `Últimos partidos${ownerName ? ` · ${ownerName}` : ""}`}
              </SheetTitle>
              <p className="text-[11px] text-muted-foreground">
                {mode === "own" ? "Hasta los 50 más recientes" : "Hasta los 10 más recientes"}
              </p>
            </div>
            <button
              type="button"
              aria-label="Cerrar"
              onClick={() => onOpenChange(false)}
              className="rounded-full border border-border bg-card p-1.5 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </SheetHeader>

          {/* Filtros */}
          <div className="flex items-center gap-1.5 overflow-x-auto px-4 py-2 border-b border-border scrollbar-none">
            <Filter className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            {(Object.keys(FILTER_LABEL) as Filter[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={cn(
                  "shrink-0 rounded-full border px-3 py-1 text-[11px] font-medium transition-smooth",
                  filter === f
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:text-foreground",
                )}
              >
                {FILTER_LABEL[f]}
              </button>
            ))}
          </div>

          {/* Lista */}
          <div className="flex-1 overflow-y-auto px-4 py-3">
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-2xl" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border bg-card/50 p-6 text-center text-xs text-muted-foreground">
                {filter === "all"
                  ? "Sin partidos jugados aún."
                  : `Sin partidos en ${FILTER_LABEL[filter].toLowerCase()}.`}
              </p>
            ) : (
              <ul className="space-y-2">
                {filtered.map((m) => (
                  <PlayedRow key={m.id} match={m} />
                ))}
              </ul>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

const PlayedRow = ({ match }: { match: PlayedMatchRow }) => {
  const badge = sourceBadge(match.source);
  const Icon = badge.icon;
  const score = formatScore(match.score);
  const dateLabel = format(parseISO(match.recorded_at), "d MMM yy", { locale: es });
  const deltaSign = match.delta > 0 ? "+" : "";
  return (
    <li className="flex items-start gap-3 rounded-2xl border border-border bg-card p-3 shadow-card">
      <span
        className={cn(
          "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          badge.classes,
        )}
        aria-hidden
      >
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider",
              match.won ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive",
            )}
          >
            {match.won ? "Ganaste" : "Perdiste"}
          </span>
          <span className={cn("rounded-full px-1.5 py-0.5 text-[9px] font-medium", badge.classes)}>
            {badge.label}
          </span>
        </div>
        {score && (
          <p className="mt-1 truncate font-display text-sm font-semibold tabular-nums text-foreground">
            {score}
          </p>
        )}
        <p className="text-[10px] text-muted-foreground">{dateLabel}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-0.5">
        <span
          className={cn(
            "inline-flex items-center gap-0.5 text-[11px] font-semibold tabular-nums",
            match.delta > 0 ? "text-success" : match.delta < 0 ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {match.delta > 0 ? (
            <TrendingUp className="h-3 w-3" />
          ) : match.delta < 0 ? (
            <TrendingDown className="h-3 w-3" />
          ) : null}
          {deltaSign}
          {match.delta.toFixed(2)}
        </span>
        <span className="text-[10px] text-muted-foreground tabular-nums">
          {match.level_after.toFixed(2)}
        </span>
      </div>
    </li>
  );
};
