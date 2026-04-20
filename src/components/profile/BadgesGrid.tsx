import { Lock } from "lucide-react";
import { useUserBadges } from "@/hooks/useUserBadges";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  userId: string;
  showLocked?: boolean;
}

export const BadgesGrid = ({ userId, showLocked = true }: Props) => {
  const { items, allBadges, loading } = useUserBadges(userId);

  if (loading) {
    return <Skeleton className="h-32 w-full rounded-2xl" />;
  }

  const earnedIds = new Set(items.map((i) => i.badge_id));
  const earned = items
    .map((i) => i.badge)
    .filter((b): b is NonNullable<typeof b> => Boolean(b));
  const locked = allBadges.filter((b) => !earnedIds.has(b.id));

  if (earned.length === 0 && !showLocked) {
    return (
      <p className="rounded-2xl border border-dashed border-border bg-card/50 p-6 text-center text-xs text-muted-foreground">
        Aún sin logros desbloqueados.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {earned.length > 0 && (
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Desbloqueados · {earned.length}
          </p>
          <div className="grid grid-cols-4 gap-2">
            {earned.map((b) => (
              <div
                key={b.id}
                title={`${b.name} — ${b.description}`}
                className="flex flex-col items-center gap-1 rounded-2xl border border-border bg-gradient-to-br from-primary/5 to-accent/5 p-2.5 text-center"
              >
                <span className="text-2xl">{b.icon}</span>
                <span className="line-clamp-2 text-[9px] font-medium leading-tight">
                  {b.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {showLocked && locked.length > 0 && (
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Por desbloquear · {locked.length}
          </p>
          <div className="grid grid-cols-4 gap-2">
            {locked.map((b) => (
              <div
                key={b.id}
                title={`${b.name} — ${b.description}`}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-2xl border border-dashed border-border bg-muted/30 p-2.5 text-center opacity-60",
                )}
              >
                <span className="relative text-2xl grayscale">
                  {b.icon}
                  <Lock className="absolute -bottom-0.5 -right-0.5 h-3 w-3 text-muted-foreground" />
                </span>
                <span className="line-clamp-2 text-[9px] font-medium leading-tight text-muted-foreground">
                  {b.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
