import { AppHeader } from "@/components/AppHeader";
import { HeroCard } from "@/components/HeroCard";

import { QuickActions } from "@/components/QuickActions";
import { UpcomingBookings } from "@/components/UpcomingBookings";
import { PendingActionsCard } from "@/components/PendingActionsCard";
import { BottomNav } from "@/components/BottomNav";
import { PlayerRatingCard } from "@/components/rating/PlayerRatingCard";
import { AnnouncementsCarousel } from "@/components/home/AnnouncementsCarousel";
import { MatchOfTheWeekCard } from "@/components/home/MatchOfTheWeekCard";
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

      <main className="mx-auto max-w-md space-y-6 pb-28 pt-2">
        <PendingActionsCard />
        <AnnouncementsCarousel />
        <HeroCard />
        <UpcomingBookings />
        <PlayerRatingCard rating={rating} category={category} loading={ratingLoading} />
        <MatchOfTheWeekCard />
        
        <QuickActions />
      </main>

      <BottomNav />
    </div>
  );
};

export default Index;
