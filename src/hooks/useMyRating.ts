import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/providers/AuthProvider";
import type { PlayerRatingRow } from "@/lib/rating-utils";

interface State {
  rating: PlayerRatingRow | null;
  loading: boolean;
  hasOnboarding: boolean;
}

/**
 * Devuelve el rating principal del usuario y si ya completó el onboarding.
 */
export const useMyRating = () => {
  const { user } = useAuth();
  const [state, setState] = useState<State>({
    rating: null,
    loading: true,
    hasOnboarding: false,
  });

  const refresh = useCallback(async () => {
    if (!user) {
      setState({ rating: null, loading: false, hasOnboarding: false });
      return;
    }
    setState((s) => ({ ...s, loading: true }));

    const { data, error } = await supabase
      .from("player_ratings")
      .select("*")
      .eq("user_id", user.id)
      .order("matches_played", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("[useMyRating] error", error);
      setState({ rating: null, loading: false, hasOnboarding: false });
      return;
    }

    setState({
      rating: (data as PlayerRatingRow | null) ?? null,
      loading: false,
      hasOnboarding: !!data?.onboarding_completed_at,
    });
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { ...state, refresh };
};
