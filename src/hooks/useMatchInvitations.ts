import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/providers/AuthProvider";

export interface MatchInvitation {
  id: string;
  inviter_user_id: string;
  invitee_user_id: string;
  status: "pending" | "accepted" | "rejected" | "expired" | "cancelled";
  proposed_slots: Array<{ starts_at: string; court_id?: string | null }>;
  selected_slot: { starts_at: string; court_id?: string | null } | null;
  message: string | null;
  compat_score: number | null;
  expires_at: string;
  responded_at: string | null;
  created_at: string;
}

export interface InvitationWithProfile extends MatchInvitation {
  counterpart: {
    user_id: string;
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
  } | null;
}

export const useMatchInvitations = () => {
  const { user } = useAuth();
  const [received, setReceived] = useState<InvitationWithProfile[]>([]);
  const [sent, setSent] = useState<InvitationWithProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("match_invitations")
      .select("*")
      .or(`inviter_user_id.eq.${user.id},invitee_user_id.eq.${user.id}`)
      .order("created_at", { ascending: false });

    const invitations = (data ?? []) as unknown as MatchInvitation[];
    const counterpartIds = Array.from(
      new Set(
        invitations.map((i) =>
          i.inviter_user_id === user.id ? i.invitee_user_id : i.inviter_user_id,
        ),
      ),
    );

    let profiles: Record<string, InvitationWithProfile["counterpart"]> = {};
    if (counterpartIds.length > 0) {
      const { data: prof } = await supabase
        .from("profiles")
        .select("user_id, first_name, last_name, avatar_url")
        .in("user_id", counterpartIds);
      (prof ?? []).forEach((p) => {
        profiles[p.user_id] = p;
      });
    }

    const enriched: InvitationWithProfile[] = invitations.map((i) => ({
      ...i,
      counterpart:
        profiles[i.inviter_user_id === user.id ? i.invitee_user_id : i.inviter_user_id] ?? null,
    }));

    setReceived(enriched.filter((i) => i.invitee_user_id === user.id));
    setSent(enriched.filter((i) => i.inviter_user_id === user.id));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Realtime
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`match_invitations_${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "match_invitations" },
        () => refresh(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user, refresh]);

  return { received, sent, loading, refresh };
};
