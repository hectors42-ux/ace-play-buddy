import { Home, CalendarDays, Trophy, Swords, User } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useTournamentNotifications } from "@/hooks/useTournamentNotifications";
import { useLadderNotifications } from "@/hooks/useLadderNotifications";

const items = [
  { id: "home", label: "Inicio", icon: Home, to: "/" },
  { id: "reservas", label: "Reservar", icon: CalendarDays, to: "/reservar" },
  { id: "torneos", label: "Torneos", icon: Trophy, to: "/torneos" },
  { id: "ladder", label: "Ladder", icon: Swords, to: "/ladder" },
  { id: "perfil", label: "Perfil", icon: User, to: null },
];

export const BottomNav = () => {
  const location = useLocation();
  const { counts } = useTournamentNotifications();
  const { counts: ladderCounts } = useLadderNotifications();
  return (
    <nav
      aria-label="Navegación principal"
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/80 backdrop-blur-xl safe-bottom"
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-around px-2 pt-2">
        {items.map((item) => {
          const Icon = item.icon;
          const active = item.to
            ? item.to === "/"
              ? location.pathname === "/"
              : location.pathname.startsWith(item.to)
            : false;
          const badgeCount =
            item.id === "torneos"
              ? counts.total
              : item.id === "ladder"
                ? ladderCounts.total
                : 0;
          const showBadge = badgeCount > 0;
          const badgeLabel = badgeCount > 9 ? "9+" : String(badgeCount);
          const inner = (
            <>
              <span
                className={cn(
                  "relative flex h-9 w-9 items-center justify-center rounded-2xl transition-smooth",
                  active && "bg-primary/10",
                )}
              >
                <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
                {showBadge && (
                  <span
                    aria-label={`${badgeCount} acciones pendientes`}
                    className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold leading-none text-destructive-foreground ring-2 ring-background"
                  >
                    {badgeLabel}
                  </span>
                )}
              </span>
              <span className="text-[10px] font-medium tracking-wide">{item.label}</span>
            </>
          );
          const className = cn(
            "flex w-full flex-col items-center gap-1 rounded-2xl px-2 py-2 transition-smooth",
            active
              ? "text-primary"
              : item.to
                ? "text-muted-foreground hover:text-foreground"
                : "text-muted-foreground/40 cursor-not-allowed",
          );
          return (
            <li key={item.id} className="flex-1">
              {item.to ? (
                <NavLink to={item.to} className={className} aria-current={active ? "page" : undefined}>
                  {inner}
                </NavLink>
              ) : (
                <div className={className} aria-disabled>
                  {inner}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

