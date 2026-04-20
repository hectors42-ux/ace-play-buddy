import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Announcement = Database["public"]["Tables"]["club_announcements"]["Row"];

export const useAnnouncements = () => {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const { data } = await supabase
        .from("club_announcements")
        .select("*")
        .order("priority", { ascending: false })
        .order("starts_at", { ascending: false })
        .limit(10);
      if (!alive) return;
      setItems((data ?? []) as Announcement[]);
      setLoading(false);
    };
    void load();
    return () => {
      alive = false;
    };
  }, []);

  return { items, loading };
};
