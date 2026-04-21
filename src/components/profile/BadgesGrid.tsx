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
            {locked.map((b) => (
              <li
                key={b.id}
                className={cn(
                  "flex items-start gap-3 rounded-2xl border border-dashed border-border bg-muted/30 p-3 opacity-75",
                )}
              >
                <span className="relative text-2xl leading-none grayscale">
                  {b.icon}
                  <Lock className="absolute -bottom-0.5 -right-0.5 h-3 w-3 text-muted-foreground" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold leading-tight text-muted-foreground">
                    {b.name}
                  </p>
                  <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground/80">
                    {b.description}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
