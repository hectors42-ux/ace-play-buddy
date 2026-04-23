import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAnalyticsFilters } from "./useAnalyticsFilters";

export interface CoachPerformance {
  coach_id: string;
  name: string;
  classes: number;
  revenue_clp: number;
  avg_ticket_clp: number;
  cancelled: number;
}

export function useAnalyticsCoaches() {
  const { from, to } = useAnalyticsFilters();
  return useQuery({
    queryKey: ["analytics", "coaches", from.toISOString(), to.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("analytics_coaches_performance", {
        p_from: from.toISOString(),
        p_to: to.toISOString(),
      });
      if (error) throw error;
      const json = data as unknown as { coaches: CoachPerformance[] };
      return json.coaches ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });
}
