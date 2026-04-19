import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Category = Tables<"tournament_categories">;
export type Tournament = Tables<"tournaments">;
export type Registration = Tables<"tournament_registrations">;
export type Match = Tables<"tournament_matches">;
export type ResultProposal = Tables<"tournament_match_results">;
export type RescheduleRequest = Tables<"tournament_match_reschedule_requests">;
export type Court = Tables<"courts">;

export type Player = Pick<
  Tables<"profiles">,
  "user_id" | "first_name" | "last_name" | "ntrp_level" | "club_ranking"
>;

export interface CategoryBundle {
  tournament: Tournament | null;
  category: Category | null;
  registrations: Registration[];
  matches: Match[];
  players: Map<string, Player>;
  pendingResults: ResultProposal[];
  pendingReschedules: RescheduleRequest[];
  courts: Court[];
}

export function useCategoryBundle(categoryId: string | undefined) {
  const [bundle, setBundle] = useState<CategoryBundle>({
    tournament: null,
    category: null,
    registrations: [],
    matches: [],
    players: new Map(),
    pendingResults: [],
    pendingReschedules: [],
    courts: [],
  });
  const [loading, setLoading] = useState(true);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const reload = useCallback(async () => {
    if (!categoryId) return;
    setRefreshing(true);
    const { data: cat } = await supabase
      .from("tournament_categories")
      .select("*")
      .eq("id", categoryId)
      .maybeSingle();
    if (!cat) {
      setBundle((b) => ({ ...b, category: null }));
      setLoading(false);
      setRefreshing(false);
      return;
    }
    const [{ data: t }, { data: regs }, { data: mts }, { data: results }, { data: resch }, { data: courts }] =
      await Promise.all([
        supabase.from("tournaments").select("*").eq("id", cat.tournament_id).maybeSingle(),
        supabase
          .from("tournament_registrations")
          .select("*")
          .eq("category_id", categoryId)
          .order("registered_at"),
        supabase
          .from("tournament_matches")
          .select("*")
          .eq("category_id", categoryId)
          .order("round", { ascending: false })
          .order("bracket_position"),
        supabase
          .from("tournament_match_results")
          .select("*")
          .eq("status", "propuesto"),
        supabase
          .from("tournament_match_reschedule_requests")
          .select("*")
          .eq("status", "pendiente"),
        supabase.from("courts").select("*").eq("is_active", true).order("sort_order"),
      ]);

    const userIds = new Set<string>();
    (regs ?? []).forEach((r) => {
      userIds.add(r.player1_user_id);
      if (r.player2_user_id) userIds.add(r.player2_user_id);
    });
    let players = new Map<string, Player>();
    if (userIds.size > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, first_name, last_name, ntrp_level, club_ranking")
        .in("user_id", Array.from(userIds));
      players = new Map((profs ?? []).map((p) => [p.user_id, p as Player]));
    }

    const matchIds = new Set((mts ?? []).map((m) => m.id));
    setBundle({
      tournament: t,
      category: cat,
      registrations: regs ?? [],
      matches: mts ?? [],
      players,
      pendingResults: (results ?? []).filter((r) => matchIds.has(r.match_id)),
      pendingReschedules: (resch ?? []).filter((r) => matchIds.has(r.match_id)),
      courts: courts ?? [],
    });
    setLoading(false);
    setRefreshing(false);
    setLastUpdatedAt(new Date());
  }, [categoryId]);

  useEffect(() => {
    setLoading(true);
    reload();
  }, [reload]);

  // Polling cada 30s mientras el torneo está activo (no finalizado/cancelado)
  const tStatus = bundle.tournament?.status;
  const cStatus = bundle.category?.status;
  const isLive =
    !!bundle.tournament &&
    tStatus !== "finalizado" &&
    tStatus !== "cancelado" &&
    tStatus !== "borrador" &&
    cStatus !== "finalizado" &&
    cStatus !== "cancelado";

  useEffect(() => {
    if (!isLive || !categoryId) return;
    const id = setInterval(() => {
      reload();
    }, 30000);
    return () => clearInterval(id);
  }, [reload, categoryId, isLive]);

  return { ...bundle, loading, reload, lastUpdatedAt, refreshing, isLive };
}

export function playerName(p: Player | undefined, fallback = "—"): string {
  if (!p) return fallback;
  return `${p.first_name} ${p.last_name}`.trim() || fallback;
}

export function registrationLabel(
  reg: Registration | undefined,
  players: Map<string, Player>,
): string {
  if (!reg) return "BYE";
  const p1 = playerName(players.get(reg.player1_user_id), "Jugador 1");
  if (!reg.player2_user_id) return p1;
  const p2 = playerName(players.get(reg.player2_user_id), "Jugador 2");
  return `${p1} / ${p2}`;
}
