import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { RatingSport } from "@/lib/rating-utils";

export interface ProfileSummaryProfile {
  user_id: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  member_since: string;
  bio: string | null;
  dominant_hand: "right" | "left" | "ambi" | null;
  backhand: "one_handed" | "two_handed" | null;
  favorite_shot: string | null;
  favorite_surface: "arcilla" | "cesped" | "dura" | "sintetico" | null;
  playing_style: string | null;
  availability: string | null;
  years_playing: number | null;
  email: string | null;
  phone: string | null;
  show_email: boolean;
  show_phone: boolean;
}

export interface ProfileSummaryRating {
  sport: RatingSport;
  level: number;
  reliability: number;
  last_change_delta: number;
  matches_played: number;
  last_match_at: string | null;
  category: "A" | "B" | "C" | null;
  best_level: number;
}

export interface ProfileSummaryRecentMatch {
  id: string;
  recorded_at: string;
  delta: number;
  level_after: number;
  source: string;
  source_ref_id: string | null;
  opponent_id: string | null;
  opponent_name?: string;
  opponent_avatar?: string | null;
  /** Marcador en formato "6-3, 4-6, 7-5" si existe (puede ser null para amistosos sin score). */
  score_summary?: string | null;
  /** Nombre del compañero en partidos de dobles. */
  partner_name?: string | null;
  won: boolean;
}

export interface ProfileSummaryBadge {
  id: string;
  awarded_at: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  category: string;
}

export interface ProfileSummary {
  profile: ProfileSummaryProfile;
  rating: ProfileSummaryRating | null;
  positions: {
    ranking: number | null;
    ladder: number | null;
    ladder_status: string | null;
  };
  stats: {
    wins: number;
    losses: number;
    walkovers_for: number;
    walkovers_against: number;
    streak: number;
    streak_kind: "desafio_ganado" | "desafio_perdido" | null;
  };
  recent_matches: ProfileSummaryRecentMatch[];
  recent_badges: ProfileSummaryBadge[];
  sparkline: number[];
  flags: {
    is_owner: boolean;
    is_admin: boolean;
    show_email: boolean;
    show_phone: boolean;
  };
}

export const useUserProfileSummary = (userId: string | null, sport: RatingSport = "tenis_singles") => {
  const [data, setData] = useState<ProfileSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!userId) {
      setData(null);
      return;
    }
    setLoading(true);
    setError(null);
    const { data: res, error: err } = await supabase.rpc("user_profile_summary", {
      _user_id: userId,
      _sport: sport,
    });
    if (err) {
      setError(err.message);
      setData(null);
    } else {
      setData(res as unknown as ProfileSummary);
    }
    setLoading(false);
  }, [userId, sport]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
};
