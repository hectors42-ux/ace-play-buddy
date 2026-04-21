import { useState } from "react";
import { ChevronDown, ChevronUp, Lock, Sparkles } from "lucide-react";
import { useUserBadges, type Badge } from "@/hooks/useUserBadges";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface Props {
  userId: string;
  showLocked?: boolean;
}

// Menor score = mejor relación complejidad/recompensa (más accesible y motivador).
const CATEGORY_WEIGHT: Record<string, number> = {
  milestone: 0,
  social: 1,
  streak: 2,
  rating: 3,
  special: 4,
};

const priorityScore = (b: Badge) => {
  const cat = CATEGORY_WEIGHT[b.category] ?? 5;
  const threshold = b.threshold ?? 999;
  return cat * 1000 + threshold;
};

export const BadgesGrid = ({ userId, showLocked = true }: Props) => {
  const { items, allBadges, loading } = useUserBadges(userId);
  const [expanded, setExpanded] = useState(false);

  if (loading) {
    return <Skeleton className="h-32 w-full rounded-2xl" />;
  }

  const earnedIds = new Set(items.map((i) => i.badge_id));
  const earned = items
    .map((i) => i.badge)
    .filter((b): b is NonNullable<typeof b> => Boolean(b));
  const locked = allBadges
    .filter((b) => !earnedIds.has(b.id))
    .sort((a, b) => priorityScore(a) - priorityScore(b));

  const featuredLocked = locked.slice(0, 3);
  const restLocked = locked.slice(3);

  if (earned.length === 0 && !showLocked) {
    return (
      <p className="rounded-2xl border border-dashed border-border bg-card/50 p-6 text-center text-xs text-muted-foreground">
        Aún sin logros desbloqueados.
      </p>
    );
  }

  const renderLockedItem = (b: Badge, highlight = false) => (
    <li
      key={b.id}
      className={cn(
        "flex items-start gap-3 rounded-2xl border border-dashed p-3 transition-smooth",
        highlight
          ? "border-primary/30 bg-primary/5 opacity-100"
          : "border-border bg-muted/30 opacity-75",
      )}
    >
      <span className="relative text-2xl leading-none grayscale">
        {b.icon}
        <Lock className="absolute -bottom-0.5 -right-0.5 h-3 w-3 text-muted-foreground" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p
            className={cn(
              "text-sm font-semibold leading-tight",
              highlight ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {b.name}
          </p>
          {highlight && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-primary/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-primary">
              <Sparkles className="h-2.5 w-2.5" />
              Cerca
            </span>
          )}
        </div>
        <p
          className={cn(
            "mt-0.5 text-[11px] leading-snug",
            highlight ? "text-muted-foreground" : "text-muted-foreground/80",
          )}
        >
          {b.description}
        </p>
      </div>
    </li>
  );

  return (
    <div className="space-y-3">
      {earned.length > 0 && (
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Desbloqueados · {earned.length}
          </p>
          <ul className="space-y-2">
            {earned.map((b) => (
              <li
                key={b.id}
                className="flex items-start gap-3 rounded-2xl border border-border bg-gradient-to-br from-primary/5 to-accent/5 p-3"
              >
                <span className="text-2xl leading-none">{b.icon}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold leading-tight text-foreground">
                    {b.name}
                  </p>
                  <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                    {b.description}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {showLocked && locked.length > 0 && (
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Por desbloquear · {locked.length}
          </p>
          <ul className="space-y-2">
            {featuredLocked.map((b) => renderLockedItem(b, true))}
          </ul>

          {restLocked.length > 0 && (
            <Collapsible open={expanded} onOpenChange={setExpanded}>
              <CollapsibleContent>
                <ul className="mt-2 space-y-2">
                  {restLocked.map((b) => renderLockedItem(b, false))}
                </ul>
              </CollapsibleContent>
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="mt-2 flex w-full items-center justify-center gap-1 rounded-2xl border border-dashed border-border bg-card/50 px-4 py-2 text-xs font-medium text-muted-foreground transition-smooth hover:bg-card"
                >
                  {expanded ? (
                    <>
                      <ChevronUp className="h-3.5 w-3.5" /> Ocultar
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-3.5 w-3.5" /> Ver {restLocked.length} más
                    </>
                  )}
                </button>
              </CollapsibleTrigger>
            </Collapsible>
          )}
        </div>
      )}
    </div>
  );
};
