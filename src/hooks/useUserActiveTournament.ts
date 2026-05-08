import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/providers/AuthProvider";
import type { Tables } from "@/integrations/supabase/types";

export type ActiveTournamentInfo = {
  tournament: Tables<"tournaments">;
  category: Pick<Tables<"tournament_categories">, "id" | "name">;
  registrationId: string;
  nextMatch: {
    id: string;
    scheduled_at: string;
    court_name: string | null;
    rival_name: string;
  } | null;
  reportableMatch: {
    id: string;
    scheduled_at: string;
  } | null;
  lastResult: {
    id: string;
    won: boolean;
    rival_name: string;
    played_at: string | null;
  } | null;
};

export function useUserActiveTournament() {
  const { user } = useAuth();
  const [data, setData] = useState<ActiveTournamentInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    let cancel = false;
    const load = async () => {
      setLoading(true);
      // Get all my regs joined with tournament + category, filter to active tournaments
      const { data: regs } = await supabase
        .from("tournament_registrations")
        .select(
          `id, category_id, tournament_id,
           tournaments!inner(*),
           tournament_categories!inner(id, name)`,
        )
        .or(`player1_user_id.eq.${user.id},player2_user_id.eq.${user.id}`)
        .in("status", ["confirmada", "pendiente_admin", "pendiente_pareja"]);

      const active = ((regs ?? []) as any[])
        .filter((r) =>
          ["inscripciones_abiertas", "en_curso"].includes(r.tournaments.status),
        )
        .sort(
          (a, b) =>
            new Date(a.tournaments.starts_at).getTime() -
            new Date(b.tournaments.starts_at).getTime(),
        );

      if (active.length === 0) {
        if (!cancel) {
          setData(null);
          setLoading(false);
        }
        return;
      }

      const reg = active[0];
      const tournament = reg.tournaments as Tables<"tournaments">;
      const category = reg.tournament_categories as Pick<
        Tables<"tournament_categories">,
        "id" | "name"
      >;

      // Match queries
      const myRegIds = ((regs ?? []) as any[])
        .filter((r) => r.tournament_id === tournament.id)
        .map((r) => r.id);

      const { data: matches } = await supabase
        .from("tournament_matches")
        .select(
          `id, scheduled_at, played_at, status, winner_registration_id,
           registration_a_id, registration_b_id,
           court:courts(name),
           ra:tournament_registrations!tournament_matches_registration_a_id_fkey(id, p1:profiles!tournament_registrations_player1_user_id_fkey(first_name, last_name)),
           rb:tournament_registrations!tournament_matches_registration_b_id_fkey(id, p1:profiles!tournament_registrations_player1_user_id_fkey(first_name, last_name))`,
        )
        .eq("tournament_id", tournament.id)
        .or(
          myRegIds
            .map((id) => `registration_a_id.eq.${id},registration_b_id.eq.${id}`)
            .join(","),
        );

      const now = Date.now();
      const ms = ((matches ?? []) as any[]).filter(
        (m) =>
          myRegIds.includes(m.registration_a_id) ||
          myRegIds.includes(m.registration_b_id),
      );

      const rivalNameOf = (m: any) => {
        const isA = myRegIds.includes(m.registration_a_id);
        const rival = isA ? m.rb : m.ra;
        const p = rival?.p1;
        return p ? `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() : "Por definir";
      };

      // Next match: programado y futuro
      const upcoming = ms
        .filter(
          (m) =>
            m.status === "programado" &&
            m.scheduled_at &&
            new Date(m.scheduled_at).getTime() >= now,
        )
        .sort(
          (a, b) =>
            new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime(),
        )[0];

      // Reportable: programado pero scheduled_at ya pasó
      const reportable = ms
        .filter(
          (m) =>
            m.status === "programado" &&
            m.scheduled_at &&
            new Date(m.scheduled_at).getTime() < now,
        )
        .sort(
          (a, b) =>
            new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime(),
        )[0];

      // Last played
      const lastPlayed = ms
        .filter((m) => m.status === "jugado" && m.played_at)
        .sort(
          (a, b) =>
            new Date(b.played_at).getTime() - new Date(a.played_at).getTime(),
        )[0];

      const result: ActiveTournamentInfo = {
        tournament,
        category,
        registrationId: reg.id,
        nextMatch: upcoming
          ? {
              id: upcoming.id,
              scheduled_at: upcoming.scheduled_at,
              court_name: upcoming.court?.name ?? null,
              rival_name: rivalNameOf(upcoming),
            }
          : null,
        reportableMatch: reportable
          ? { id: reportable.id, scheduled_at: reportable.scheduled_at }
          : null,
        lastResult: lastPlayed
          ? {
              id: lastPlayed.id,
              won: myRegIds.includes(lastPlayed.winner_registration_id),
              rival_name: rivalNameOf(lastPlayed),
              played_at: lastPlayed.played_at,
            }
          : null,
      };

      if (!cancel) {
        setData(result);
        setLoading(false);
      }
    };
    load();
    return () => {
      cancel = true;
    };
  }, [user]);

  return { data, loading };
}
