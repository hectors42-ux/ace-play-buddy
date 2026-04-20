import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/providers/AuthProvider";

export interface PendingActions {
  loading: boolean;
  ladderChallengesReceived: number;
  ladderResultsToConfirm: number;
  tournamentResultsToConfirm: number;
  doublesInvitations: number;
  rescheduleRequests: number;
  total: number;
}

const EMPTY: PendingActions = {
  loading: true,
  ladderChallengesReceived: 0,
  ladderResultsToConfirm: 0,
  tournamentResultsToConfirm: 0,
  doublesInvitations: 0,
  rescheduleRequests: 0,
  total: 0,
};

export const usePendingActions = (): PendingActions => {
  const { user } = useAuth();
  const [state, setState] = useState<PendingActions>(EMPTY);

  useEffect(() => {
    if (!user) {
      setState({ ...EMPTY, loading: false });
      return;
    }
    let cancel = false;
    (async () => {
      const { data, error } = await supabase.rpc("home_pending_actions");
      if (cancel) return;
      if (error || !data || data.length === 0) {
        setState({ ...EMPTY, loading: false });
        return;
      }
      const r = data[0];
      setState({
        loading: false,
        ladderChallengesReceived: r.ladder_challenges_received ?? 0,
        ladderResultsToConfirm: r.ladder_results_to_confirm ?? 0,
        tournamentResultsToConfirm: r.tournament_results_to_confirm ?? 0,
        doublesInvitations: r.doubles_invitations ?? 0,
        rescheduleRequests: r.reschedule_requests ?? 0,
        total: r.total ?? 0,
      });
    })();
    return () => {
      cancel = true;
    };
  }, [user]);

  return state;
};
