import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/providers/AuthProvider";

export interface PartnerSuggestion {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  level: number | null;
  level_diff: number | null;
  compat_score: number | null;
  reasons: string[] | null;
}

export const usePartnerSuggestions = (limit = 12) => {
  const { user } = useAuth();
  const [rows, setRows] = useState<PartnerSuggestion[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase.rpc("get_partner_suggestions", { _limit: limit });
    if (!error && data) setRows(data as PartnerSuggestion[]);
    setLoading(false);
  }, [user, limit]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { rows, loading, refresh };
};
