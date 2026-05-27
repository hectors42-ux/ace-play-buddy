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
  overlap_count?: number;
}

export const useMatchOpenPosts = () => {
  const { user, profile } = useAuth();
  const [posts, setPosts] = useState<OpenPost[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!profile?.tenant_id || !user) return;
    setLoading(true);

    // Mi disponibilidad (weekday + rango de horas) para calcular overlap
    const { data: avail } = await supabase
      .from("user_availability")
      .select("weekday, starts_at, ends_at")
      .eq("user_id", user.id)
      .eq("is_active", true);

    const myAvail = (avail ?? []) as { weekday: number; starts_at: string; ends_at: string }[];

    const isInMyAvail = (iso: string) => {
      const d = new Date(iso);
      const wd = d.getDay();
      const hh = d.getHours();
      const mm = d.getMinutes();
      const minutes = hh * 60 + mm;
      return myAvail.some((a) => {
        if (a.weekday !== wd) return false;
        const [sh, sm] = a.starts_at.split(":").map(Number);
        const [eh, em] = a.ends_at.split(":").map(Number);
        return minutes >= sh * 60 + sm && minutes <= eh * 60 + em;
      });
    };

    const { data } = await supabase
      .from("match_open_posts")
      .select("*")
      .eq("tenant_id", profile.tenant_id)
      .eq("status", "open")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });

    const list = (data ?? []) as unknown as OpenPost[];
    const ids = Array.from(new Set(list.map((p) => p.user_id)));
    const authors: Record<string, OpenPost["author"]> = {};
    if (ids.length > 0) {
      const { data: prof } = await supabase
        .from("profiles_directory")
        .select("user_id, first_name, last_name, avatar_url")
        .in("user_id", ids);
      (prof ?? []).forEach((p) => {
        authors[p.user_id] = p;
      });
    }

    const enriched = list.map((p) => {
      const slots = Array.isArray(p.available_slots) ? p.available_slots : [];
      const overlap = slots.filter((s) => s?.starts_at && isInMyAvail(s.starts_at)).length;
      return { ...p, author: authors[p.user_id] ?? null, overlap_count: overlap };
    });

    // Ordenar: propios primero, luego por overlap desc, luego por created_at desc (ya estaba)
    enriched.sort((a, b) => {
      if (a.user_id === user.id && b.user_id !== user.id) return -1;
      if (b.user_id === user.id && a.user_id !== user.id) return 1;
      return (b.overlap_count ?? 0) - (a.overlap_count ?? 0);
    });

    setPosts(enriched);
    setLoading(false);
  }, [profile, user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { posts, loading, refresh, currentUserId: user?.id };
};
