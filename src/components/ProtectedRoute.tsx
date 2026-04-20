import { Navigate, useLocation } from "react-router-dom";
import { useEffect, useState, type ReactNode } from "react";
import { useAuth, type AppRole } from "@/components/providers/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { DuesGate } from "@/components/DuesGate";

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: AppRole | AppRole[];
  /** Si true (default), bloquea acceso si el usuario no completó el cuestionario de nivel inicial */
  requireRatingOnboarding?: boolean;
}

export const ProtectedRoute = ({
  children,
  requiredRole,
  requireRatingOnboarding = true,
}: ProtectedRouteProps) => {
  const location = useLocation();
  const { user, roles, loading } = useAuth();
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [hasOnboarding, setHasOnboarding] = useState(false);

  useEffect(() => {
    if (!user || !requireRatingOnboarding) {
      setOnboardingChecked(true);
      return;
    }

    // Cache por usuario en sessionStorage para evitar re-chequeos en cada navegación
    const cacheKey = `aceplay-onboarding-done-${user.id}`;
    const navState = (location.state as { onboardingCompleted?: boolean } | null);
    if (navState?.onboardingCompleted) {
      try {
        sessionStorage.setItem(cacheKey, "1");
      } catch {
        // ignore
      }
      setHasOnboarding(true);
      setOnboardingChecked(true);
      return;
    }

    try {
      if (sessionStorage.getItem(cacheKey) === "1") {
        setHasOnboarding(true);
        setOnboardingChecked(true);
        return;
      }
    } catch {
      // ignore
    }

    let cancel = false;
    (async () => {
      const { data, error } = await supabase.rpc("has_completed_rating_onboarding", {
        _user_id: user.id,
      });

      if (cancel) return;
      if (error) {
        // Falla del RPC: NO redirigir al onboarding (evita el loop reportado).
        // Asumimos completado para no re-lanzar el cuestionario.
        console.error("[ProtectedRoute] onboarding check error", error);
        setHasOnboarding(true);
        setOnboardingChecked(true);
        return;
      }

      const done = Boolean(data);
      if (done) {
        try {
          sessionStorage.setItem(cacheKey, "1");
        } catch {
          // ignore
        }
      }
      setHasOnboarding(done);
      setOnboardingChecked(true);
    })();

    return () => {
      cancel = true;
    };
  }, [user, requireRatingOnboarding, location.state]);

  if (loading || (user && !onboardingChecked)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-pulse rounded-full bg-primary/20" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (
    requireRatingOnboarding &&
    !hasOnboarding &&
    location.pathname !== "/onboarding/nivel"
  ) {
    return <Navigate to="/onboarding/nivel" replace />;
  }

  if (requiredRole) {
    const required = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    const ok = required.some((r) => roles.includes(r)) || roles.includes("super_admin");
    if (!ok) {
      return <Navigate to="/" replace />;
    }
  }

  return <DuesGate>{children}</DuesGate>;
};
