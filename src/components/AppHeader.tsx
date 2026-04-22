import clubLogo from "@/assets/club-logo.png";
import { NotificationCenter } from "@/components/NotificationCenter";

interface AppHeaderProps {
  memberName: string;
  greeting: string;
}

export const AppHeader = ({ memberName, greeting }: AppHeaderProps) => {
  return (
    <header className="safe-top sticky top-0 z-30 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-md lg:max-w-6xl items-center justify-between gap-3 px-5 lg:px-6 pb-3 pt-3">
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

        <div className="flex items-center gap-2">
          <NotificationCenter />
        </div>
      </div>
    </header>
  );
};
