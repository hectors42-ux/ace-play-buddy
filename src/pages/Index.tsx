import { useEffect } from "react";
import { AppHeader } from "@/components/AppHeader";
import { HeroCard } from "@/components/HeroCard";
import { QuickActions } from "@/components/QuickActions";
import { UpcomingBookingsLink } from "@/components/UpcomingBookingsLink";
import { BottomNav } from "@/components/BottomNav";
import { LevelHeroCard } from "@/components/rating/LevelHeroCard";
import { AnnouncementsCarousel } from "@/components/home/AnnouncementsCarousel";
import { MatchOfTheWeekCard } from "@/components/home/MatchOfTheWeekCard";
import { CoachUpcomingClassesCard } from "@/components/home/CoachUpcomingClassesCard";
import { HomeRecentMatchesCard } from "@/components/home/HomeRecentMatchesCard";
import { useAuth } from "@/components/providers/AuthProvider";
import { useUserProfileSummary } from "@/hooks/useUserProfileSummary";
import { prefetchAppRoutes } from "@/lib/prefetch-routes";

const Index = () => {
  const { profile, user } = useAuth();
  const { data: summary, loading: summaryLoading } = useUserProfileSummary(user?.id ?? null, "tenis_singles");

  // Prefetch de rutas del bottom-nav durante el idle del navegador.
  // Acelera la primera navegación a Reservar/Torneos/Ranking/Perfil.
  useEffect(() => {
    prefetchAppRoutes();
  }, []);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Buen día" : hour < 19 ? "Buenas tardes" : "Buenas noches";
  const memberName = profile ? `${profile.first_name} ${profile.last_name}`.trim() : "Socio";

  return (
    <div className="min-h-screen bg-background">
      <AppHeader memberName={memberName} greeting={greeting} />

      <main className="mx-auto max-w-md lg:max-w-6xl space-y-3 pb-28 md:pb-12 pt-2 px-0 lg:px-6">
        <AnnouncementsCarousel />

        {/* Desktop: 2-column grid; Mobile: stack natural */}
        <div className="lg:grid lg:grid-cols-3 lg:gap-6 space-y-3 lg:space-y-0">
          <div className="lg:col-span-2 space-y-3">
            <HeroCard />
            <UpcomingBookingsLink />
            <CoachUpcomingClassesCard />
            <HomeRecentMatchesCard />
            <section className="px-5" aria-label="Tu nivel actual">
              <LevelHeroCard
                level={summary?.rating?.level ?? null}
                category={summary?.rating?.category ?? null}
                delta={summary?.rating?.last_change_delta ?? 0}
                sport="tenis_singles"
                rankingPosition={summary?.positions.ranking ?? null}
                ladderPosition={summary?.positions.ladder ?? null}
                ladderStatus={summary?.positions.ladder_status ?? null}
                variant="slim"
                loading={summaryLoading}
                linkToProfile
              />
            </section>
          </div>
          <aside className="space-y-3">
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

