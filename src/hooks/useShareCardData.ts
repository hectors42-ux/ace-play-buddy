import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ShareUser {
  first_name?: string | null;
  last_name?: string | null;
  avatar_url?: string | null;
}

export interface ShareStats {
  found: boolean;
  category_id?: string | null;
  registration_id?: string | null;
  rank?: number | null;
  points: number;
  consecutive_wins: number;
  total_players: number;
  wins: number;
  losses: number;
  is_winner: boolean;
  user?: ShareUser | null;
}

export interface ShareStandingsRow {
  user_id: string;
  position: number;
  points: number;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
}

export interface ShareStandings {
  category_id: string | null;
  rows: ShareStandingsRow[];
}

const EMPTY_STATS: ShareStats = {
  found: false,
  points: 0,
  consecutive_wins: 0,
  total_players: 0,
  wins: 0,
  losses: 0,
  is_winner: false,
};

export function useShareCardData(tournamentId: string | undefined, userId: string | undefined) {
  const [stats, setStats] = useState<ShareStats>(EMPTY_STATS);
  const [loading, setLoading] = useState<boolean>(Boolean(tournamentId && userId));

  useEffect(() => {
    if (!tournamentId || !userId) {
      setStats(EMPTY_STATS);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);

    (async () => {
      // @ts-expect-error - RPC generated types may lag behind migration
      const { data, error } = await supabase.rpc("get_share_card_stats", {
        _tournament_id: tournamentId,
        _user_id: userId,
      });
      if (cancelled) return;
      if (error || !data) {
        setStats(EMPTY_STATS);
      } else {
        setStats({ ...EMPTY_STATS, ...(data as ShareStats) });
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [tournamentId, userId]);

  return { stats, loading };
}

export function useShareStandings(
  tournamentId: string | undefined,
  categoryId?: string | null,
) {
  const [standings, setStandings] = useState<ShareStandings>({
    category_id: null,
    rows: [],
  });
  const [loading, setLoading] = useState<boolean>(Boolean(tournamentId));

  useEffect(() => {
    if (!tournamentId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);

    const load = async () => {
      // @ts-expect-error - RPC types may lag
      const { data } = await supabase.rpc("get_share_standings", {
        _tournament_id: tournamentId,
        _category_id: categoryId ?? null,
        _limit: 12,
      });
      if (cancelled) return;
      setStandings((data as ShareStandings) ?? { category_id: null, rows: [] });
      setLoading(false);
    };

    void load();

    const ch = supabase
      .channel(`share-standings-${tournamentId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "standings_snapshots",
          filter: `tournament_id=eq.${tournamentId}`,
        },
        () => void load(),
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(ch);
    };
  }, [tournamentId, categoryId]);

  return { standings, loading };
}