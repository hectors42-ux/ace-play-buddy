import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/providers/AuthProvider";

export interface TournamentPendingCounts {
  result_proposals: number;
  reschedule_requests: number;
  doubles_invitations: number;
  admin_pending_registrations: number;
  total: number;
}

const EMPTY: TournamentPendingCounts = {
  result_proposals: 0,
  reschedule_requests: 0,
  doubles_invitations: 0,
  admin_pending_registrations: 0,
  total: 0,
};

/**
 * Devuelve los conteos de acciones pendientes (resultados a confirmar,
 * reagendamientos, invitaciones de dobles, e inscripciones pendientes
 * para admins). Refresca cada 60s y al recibir cambios realtime sobre
 * las tablas relevantes.
 */
export function useTournamentNotifications() {
  const { user } = useAuth();
  const [counts, setCounts] = useState<TournamentPendingCounts>(EMPTY);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) {
      setCounts(EMPTY);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.rpc("tournament_pending_counts");
    setLoading(false);
    if (error) {
      console.warn("[notifications] failed to fetch counts", error);
      return;
    }
    const row = Array.isArray(data) ? data[0] : data;
    if (row) {
      setCounts({
        result_proposals: row.result_proposals ?? 0,
        reschedule_requests: row.reschedule_requests ?? 0,
        doubles_invitations: row.doubles_invitations ?? 0,
        admin_pending_registrations: row.admin_pending_registrations ?? 0,
        total: row.total ?? 0,
      });
    }
  }, [user]);

  useEffect(() => {
    refresh();
    if (!user) return;

    // Polling cada 60s
    const interval = setInterval(refresh, 60_000);

    // Realtime: cuando cambian las tablas relevantes, refrescar
    const channel = supabase
      .channel(`tournament-notifications-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tournament_match_results" },
        () => refresh(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tournament_match_reschedule_requests" },
        () => refresh(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tournament_registrations" },
        () => refresh(),
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [user, refresh]);

  return { counts, loading, refresh };
}
