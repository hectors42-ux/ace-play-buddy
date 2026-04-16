import { Bell } from "lucide-react";
import clubLogo from "@/assets/club-logo.png";

interface AppHeaderProps {
  memberName: string;
  greeting: string;
}

export const AppHeader = ({ memberName, greeting }: AppHeaderProps) => {
  return (
    <header className="safe-top sticky top-0 z-30 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-md items-center justify-between gap-3 px-5 pb-3 pt-3">
        <div className="flex items-center gap-3">
          <div className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-gradient-clay shadow-clay">
            <img
              src={clubLogo}
              alt="Club de Tenis Providencia"
              width={44}
              height={44}
              className="h-9 w-9 object-contain"
            />
          </div>
          <div className="leading-tight">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              {greeting}
            </p>
            <p className="font-display text-lg font-semibold text-foreground">
              {memberName}
            </p>
          </div>
        </div>

        <button
          type="button"
          aria-label="Notificaciones"
          className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-card text-foreground transition-smooth hover:bg-muted"
        >
          <Bell className="h-5 w-5" strokeWidth={2} />
          <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-primary ring-2 ring-background" />
        </button>
      </div>
    </header>
  );
};
