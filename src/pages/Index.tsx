import { Link } from "react-router-dom";
import { Settings } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { HeroCard } from "@/components/HeroCard";
import { StatsRow } from "@/components/StatsRow";
import { QuickActions } from "@/components/QuickActions";
import { UpcomingBookings } from "@/components/UpcomingBookings";
import { PendingActionsCard } from "@/components/PendingActionsCard";
import { BottomNav } from "@/components/BottomNav";
import { PlayerRatingCard } from "@/components/rating/PlayerRatingCard";
import { useAuth } from "@/components/providers/AuthProvider";
import { useMyRatingWithCategory } from "@/hooks/useMyRatingWithCategory";

const Index = () => {
  const { profile, isAdmin } = useAuth();
  const { rating, category, loading: ratingLoading } = useMyRatingWithCategory();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Buen día" : hour < 19 ? "Buenas tardes" : "Buenas noches";
  const memberName = profile ? `${profile.first_name} ${profile.last_name}`.trim() : "Socio";

  return (
    <div className="min-h-screen bg-gradient-warm">
      <AppHeader memberName={memberName} greeting={greeting} />

      <main className="mx-auto max-w-md space-y-6 pb-28 pt-2">
        {/* 1. Acciones que requieren atención (solo si hay) */}
        <PendingActionsCard />
        {/* 2. Próxima reserva con overlay (o CTA si no hay) */}
        <HeroCard />
        {/* 3. Detalle de próximas reservas (si hay más de una) */}
        <UpcomingBookings />
        {/* 4. Identidad competitiva: rating */}
        <PlayerRatingCard rating={rating} category={category} loading={ratingLoading} />
        {/* 5. Stats agregadas */}
        <StatsRow />
        {/* 6. Atajos */}
        <QuickActions />

        {isAdmin && (
          <div className="space-y-2 px-5">
            <Link
              to="/admin/canchas"
              className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground shadow-card transition-smooth hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-primary" />
                Canchas y reglas
              </span>
              <span className="text-xs text-muted-foreground">Solo admins</span>
            </Link>
            <Link
              to="/admin/socios"
              className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground shadow-card transition-smooth hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-primary" />
                Administrar socios
              </span>
              <span className="text-xs text-muted-foreground">Solo admins</span>
            </Link>
            <Link
              to="/admin/torneos"
              className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground shadow-card transition-smooth hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-primary" />
                Administrar torneos
              </span>
              <span className="text-xs text-muted-foreground">Solo admins</span>
            </Link>
          </div>
        )}

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
