import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/providers/AuthProvider";

export type NotificationKind =
  | "result_proposal"
  | "reschedule_request"
  | "doubles_invitation"
  | "admin_registration"
  | "ladder_challenge"
  | "ladder_challenge_accepted"
  | "ladder_propose_slots"
  | "ladder_slots_proposed"
  | "ladder_result_pending"
  | "ladder_result"
  | "challenge_expired"
  | "booking_partner"
  | "match_acceptance"
  | "class_invitation"
  | "partner_invitation"
  | "partner_invitation_accepted"
  | "partner_invitation_rejected"
  | "partner_match_booked"
  | "partner_match_cancelled"
  | "partner_match_reminder";

export interface NotificationItem {
  kind: NotificationKind;
  ref_id: string;
  title: string;
  description: string;
  link: string;
  created_at: string;
}

/**
 * Feed unificado de acciones pendientes (torneos + ladder).
 * Refresca cada 90s y al recibir cambios en las tablas relevantes.
 */
export function useNotificationsFeed() {
  const { user } = useAuth();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) {
      setItems([]);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.rpc("notifications_feed");
    setLoading(false);
    if (error) {
      console.warn("[notifications-feed] failed", error);
      return;
    }
    const list = (data ?? []) as NotificationItem[];
    list.sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));
    setItems(list);
  }, [user]);

  useEffect(() => {
    void refresh();
    if (!user) return;

    const interval = setInterval(() => void refresh(), 90_000);

    const channel = supabase
      .channel(`notifications-feed-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tournament_match_results" },
        () => void refresh(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tournament_match_reschedule_requests" },
        () => void refresh(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tournament_registrations" },
        () => void refresh(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ladder_challenges" },
        () => void refresh(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ladder_challenge_schedule_proposals" },
        () => void refresh(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tournament_matches" },
        () => void refresh(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        () => void refresh(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "coach_class_bookings" },
        () => void refresh(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_notifications", filter: `user_id=eq.${user.id}` },
        () => void refresh(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "match_invitations" },
        () => void refresh(),
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      void supabase.removeChannel(channel);
    };
  }, [user, refresh]);

  return { items, loading, refresh, total: items.length };
}
