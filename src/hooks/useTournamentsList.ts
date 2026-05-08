import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/providers/AuthProvider";
import type { Tables } from "@/integrations/supabase/types";
import type { TournamentStatus } from "@/lib/tournament-utils";

export type RecentEnrollee = {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  registered_at: string;
};

export type TournamentListItem = Tables<"tournaments"> & {
  tournament_categories: Pick<
    Tables<"tournament_categories">,
    "id" | "name" | "discipline" | "max_participants"
  >[];
  enrolled_count: number;
  capacity: number;
  recent_enrolled: RecentEnrollee[];
  user_registration: {
    id: string;
    category_id: string;
    status: Tables<"tournament_registrations">["status"];
  } | null;
  user_past_result: string | null;
};

type RegRow = {
  id: string;
  tournament_id: string;
  category_id: string;
  registered_at: string;
  status: Tables<"tournament_registrations">["status"];
  player1_user_id: string;
  player2_user_id: string | null;
  p1: { user_id: string; first_name: string | null; last_name: string | null; avatar_url: string | null } | null;
  p2: { user_id: string; first_name: string | null; last_name: string | null; avatar_url: string | null } | null;
};

export function useTournamentsList() {
  const { user } = useAuth();
  const [tournaments, setTournaments] = useState<TournamentListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    const load = async () => {
      setLoading(true);
      const { data: ts } = await supabase
        .from("tournaments")
        .select("*, tournament_categories(id, name, discipline, max_participants)")
        .order("starts_at", { ascending: false });
      const tournaments = (ts ?? []) as (Tables<"tournaments"> & {
        tournament_categories: Pick<
          Tables<"tournament_categories">,
          "id" | "name" | "discipline" | "max_participants"
        >[];
      })[];

      const ids = tournaments.map((t) => t.id);
      let regs: RegRow[] = [];
      if (ids.length > 0) {
        const { data } = await supabase
          .from("tournament_registrations")
          .select(
            `id, tournament_id, category_id, registered_at, status, player1_user_id, player2_user_id,
             p1:profiles!tournament_registrations_player1_user_id_fkey(user_id, first_name, last_name, avatar_url),
             p2:profiles!tournament_registrations_player2_user_id_fkey(user_id, first_name, last_name, avatar_url)`,
          )
          .in("tournament_id", ids)
          .in("status", ["confirmada", "pendiente_admin", "pendiente_pareja"])
          .order("registered_at", { ascending: false });
        regs = ((data as unknown) as RegRow[]) ?? [];
      }

      // Past results: matches where finalized tournaments and user participated
      const finalizedIds = tournaments
        .filter((t) => t.status === "finalizado")
        .map((t) => t.id);
      const pastResultByTournament = new Map<string, string>();
      if (user && finalizedIds.length > 0) {
        const myRegIds = regs
          .filter(
            (r) =>
              finalizedIds.includes(r.tournament_id) &&
              (r.player1_user_id === user.id || r.player2_user_id === user.id),
          )
          .map((r) => r.id);
        if (myRegIds.length > 0) {
          const { data: matches } = await supabase
            .from("tournament_matches")
            .select("tournament_id, round, winner_registration_id, registration_a_id, registration_b_id, status")
            .in("tournament_id", finalizedIds)
            .in("status", ["jugado", "walkover"]);
          const byT = new Map<string, typeof matches>();
          for (const m of matches ?? []) {
            if (!byT.has(m.tournament_id)) byT.set(m.tournament_id, []);
            byT.get(m.tournament_id)!.push(m);
          }
          for (const [tid, ms] of byT) {
            const mine = (ms ?? []).filter(
              (m) => myRegIds.includes(m.registration_a_id ?? "") || myRegIds.includes(m.registration_b_id ?? ""),
            );
            if (mine.length === 0) continue;
            // Final = round 1; if won → Campeón; lost → Finalista
            const final = mine.find((m) => m.round === 1);
            if (final && myRegIds.includes(final.winner_registration_id ?? "")) {
              pastResultByTournament.set(tid, "Campeón");
              continue;
            }
            // Else: ronda más baja en la que perdió
            const lost = mine
              .filter((m) => m.winner_registration_id && !myRegIds.includes(m.winner_registration_id))
              .sort((a, b) => a.round - b.round)[0];
            if (lost) {
              const label =
                lost.round === 1
                  ? "Finalista"
                  : lost.round === 2
                    ? "Semifinalista"
                    : lost.round === 3
                      ? "Cuartos"
                      : lost.round === 4
                        ? "Octavos"
                        : `Ronda ${lost.round}`;
              pastResultByTournament.set(tid, `Eliminado en ${label}`);
            } else if (mine.some((m) => m.winner_registration_id && myRegIds.includes(m.winner_registration_id))) {
              pastResultByTournament.set(tid, "Participó");
            }
          }
        }
      }

      const enriched: TournamentListItem[] = tournaments.map((t) => {
        const tregs = regs.filter((r) => r.tournament_id === t.id);
        const capacity = (t.tournament_categories ?? []).reduce(
          (s, c) => s + c.max_participants,
          0,
        );
        const enrolled = tregs.length;
        const recent: RecentEnrollee[] = tregs.slice(0, 3).map((r) => ({
          user_id: r.p1?.user_id ?? r.player1_user_id,
          first_name: r.p1?.first_name ?? null,
          last_name: r.p1?.last_name ?? null,
          avatar_url: r.p1?.avatar_url ?? null,
          registered_at: r.registered_at,
        }));
        const myReg = user
          ? tregs.find(
              (r) => r.player1_user_id === user.id || r.player2_user_id === user.id,
            )
          : null;
        return {
          ...t,
          enrolled_count: enrolled,
          capacity,
          recent_enrolled: recent,
          user_registration: myReg
            ? { id: myReg.id, category_id: myReg.category_id, status: myReg.status }
            : null,
          user_past_result: pastResultByTournament.get(t.id) ?? null,
        };
      });

      if (!cancel) {
        setTournaments(enriched);
        setLoading(false);
      }
    };
    load();
    return () => {
      cancel = true;
    };
  }, [user]);

  const status = (t: TournamentListItem) => t.status as TournamentStatus;
  const userActiveTournaments = tournaments.filter(
    (t) =>
      t.user_registration &&
      (status(t) === "inscripciones_abiertas" || status(t) === "en_curso"),
  );
  const userHistory = tournaments.filter(
    (t) => t.user_registration && status(t) === "finalizado",
  );

  return { tournaments, loading, userActiveTournaments, userHistory };
}
