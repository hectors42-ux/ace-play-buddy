import { AppHeader } from "@/components/AppHeader";
import { HeroCard } from "@/components/HeroCard";
import { StatsRow } from "@/components/StatsRow";
import { QuickActions } from "@/components/QuickActions";
import { UpcomingBookings } from "@/components/UpcomingBookings";
import { BottomNav } from "@/components/BottomNav";

const Index = () => {
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Buen día" : hour < 19 ? "Buenas tardes" : "Buenas noches";

  return (
    <div className="min-h-screen bg-gradient-warm">
      <AppHeader memberName="Héctor Smith" greeting={greeting} />

      <main className="mx-auto max-w-md space-y-6 pb-28 pt-2">
        <HeroCard />
        <StatsRow />
        <QuickActions />
        <UpcomingBookings />

        <footer className="px-5 pt-2 text-center">
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Powered by AcePlay
          </p>
        </footer>
      </main>

      <BottomNav />
    </div>
  );
};

export default Index;
