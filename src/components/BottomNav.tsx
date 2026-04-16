import { Home, CalendarDays, Users, Trophy, User } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { id: "home", label: "Inicio", icon: Home, active: true },
  { id: "reservas", label: "Reservar", icon: CalendarDays, active: false },
  { id: "social", label: "Partner", icon: Users, active: false },
  { id: "torneos", label: "Torneos", icon: Trophy, active: false },
  { id: "perfil", label: "Perfil", icon: User, active: false },
];

export const BottomNav = () => {
  return (
    <nav
      aria-label="Navegación principal"
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/80 backdrop-blur-xl safe-bottom"
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-around px-2 pt-2">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.id} className="flex-1">
              <button
                type="button"
                className={cn(
                  "flex w-full flex-col items-center gap-1 rounded-2xl px-2 py-2 transition-smooth",
                  item.active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
                aria-current={item.active ? "page" : undefined}
              >
                <span
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-2xl transition-smooth",
                    item.active && "bg-primary/10",
                  )}
                >
                  <Icon className="h-5 w-5" strokeWidth={item.active ? 2.5 : 2} />
                </span>
                <span className="text-[10px] font-medium tracking-wide">
                  {item.label}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};
