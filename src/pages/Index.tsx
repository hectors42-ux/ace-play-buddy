import { AppHeader } from "@/components/AppHeader";
import { HeroCard } from "@/components/HeroCard";
import { QuickActions } from "@/components/QuickActions";
import { UpcomingBookings } from "@/components/UpcomingBookings";
import { BottomNav } from "@/components/BottomNav";
import { PlayerRatingCard } from "@/components/rating/PlayerRatingCard";
import { AnnouncementsCarousel } from "@/components/home/AnnouncementsCarousel";
import { MatchOfTheWeekCard } from "@/components/home/MatchOfTheWeekCard";
import { CoachUpcomingClassesCard } from "@/components/home/CoachUpcomingClassesCard";
import { useAuth } from "@/components/providers/AuthProvider";
import { useMyRatingWithCategory } from "@/hooks/useMyRatingWithCategory";

const Index = () => {
  const { profile } = useAuth();
  const { rating, category, loading: ratingLoading } = useMyRatingWithCategory();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Buen día" : hour < 19 ? "Buenas tardes" : "Buenas noches";
  const memberName = profile ? `${profile.first_name} ${profile.last_name}`.trim() : "Socio";

  return (
    <div className="min-h-screen bg-gradient-warm">
      <AppHeader memberName={memberName} greeting={greeting} />

      <main className="mx-auto max-w-md lg:max-w-6xl space-y-4 pb-28 md:pb-12 pt-2 px-0 lg:px-6">
        <AnnouncementsCarousel />

        {/* Desktop: 2-column grid; Mobile: stack natural */}
        <div className="lg:grid lg:grid-cols-3 lg:gap-6 space-y-4 lg:space-y-0">
          <div className="lg:col-span-2 space-y-4">
            <HeroCard />
            <UpcomingBookings />
            <CoachUpcomingClassesCard />
            <PlayerRatingCard rating={rating} category={category} loading={ratingLoading} />
          </div>
          <aside className="space-y-4">
            <MatchOfTheWeekCard />
            <QuickActions />
          </aside>
        </div>

        <footer className="space-y-1 px-5 pt-2 text-center">
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Powered by AcePlay · 2026
          </p>
          <p className="text-[10px] text-muted-foreground/80">
            Todos los derechos reservados.
          </p>
        </footer>
      </main>

      <BottomNav />
    </div>
  );
};

export default Index;
