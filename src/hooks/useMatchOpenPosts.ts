import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/providers/AuthProvider";

export interface OpenPost {
  id: string;
  user_id: string;
  format: "1set" | "best_of_3" | "best_of_5";
  available_slots: Array<{ starts_at: string }>;
  note: string | null;
  status: string;
  expires_at: string;
  created_at: string;
  author?: {
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
  } | null;
}

export const useMatchOpenPosts = () => {
  const { user, profile } = useAuth();
  const [posts, setPosts] = useState<OpenPost[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!profile?.tenant_id) return;
    setLoading(true);
    const { data } = await supabase
      .from("match_open_posts")
      .select("*")
      .eq("tenant_id", profile.tenant_id)
      .eq("status", "open")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });

    const list = (data ?? []) as unknown as OpenPost[];
    const ids = Array.from(new Set(list.map((p) => p.user_id)));
    let authors: Record<string, OpenPost["author"]> = {};
    if (ids.length > 0) {
      const { data: prof } = await supabase
        .from("profiles")
        .select("user_id, first_name, last_name, avatar_url")
        .in("user_id", ids);
      (prof ?? []).forEach((p) => {
        authors[p.user_id] = p;
      });
    }
    setPosts(list.map((p) => ({ ...p, author: authors[p.user_id] ?? null })));
    setLoading(false);
  }, [profile]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { posts, loading, refresh, currentUserId: user?.id };
};
