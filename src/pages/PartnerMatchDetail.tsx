import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ArrowLeft, CalendarCheck, Clock, Loader2, MapPin, Trophy } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { AddToCalendarButton } from "@/components/shared/AddToCalendarButton";

interface Inv {
  id: string;
  tenant_id: string;
  inviter_user_id: string;
  invitee_user_id: string;
  status: string;
  selected_slot: { starts_at?: string; court_id?: string | null } | null;
  proposed_slots: Array<{ starts_at: string }>;
  message: string | null;
  booking_id: string | null;
}

interface ProfileLite {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
}

interface CourtLite {
  id: string;
  name: string;
  surface: string;
  slot_minutes: number;
}

const initials = (a?: string | null, b?: string | null) =>
  `${a?.[0] ?? ""}${b?.[0] ?? ""}`.toUpperCase() || "?";

export default function PartnerMatchDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [inv, setInv] = useState<Inv | null>(null);
  const [counterpart, setCounterpart] = useState<ProfileLite | null>(null);
  const [courts, setCourts] = useState<CourtLite[]>([]);
  const [busyCourtIds, setBusyCourtIds] = useState<Set<string>>(new Set());
  const [selectedCourtId, setSelectedCourtId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const startsAt = inv?.selected_slot?.starts_at ?? null;
  const startsAtDate = useMemo(() => (startsAt ? new Date(startsAt) : null), [startsAt]);
  const endsAtDate = useMemo(
    () => (startsAtDate ? new Date(startsAtDate.getTime() + 90 * 60_000) : null),
    [startsAtDate],
  );

  const load = async () => {
    if (!id || !user) return;
    setLoading(true);

    const { data: invData, error } = await supabase
      .from("match_invitations")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error || !invData) {
      toast({ title: "Invitación no encontrada", variant: "destructive" });
      setLoading(false);
      return;
    }
    const i = invData as unknown as Inv;
    setInv(i);

    const otherId = i.inviter_user_id === user.id ? i.invitee_user_id : i.inviter_user_id;
    const { data: prof } = await supabase
      .from("profiles")
      .select("user_id, first_name, last_name, avatar_url")
      .eq("user_id", otherId)
      .maybeSingle();
    setCounterpart(prof as ProfileLite | null);

    const slotIso = i.selected_slot?.starts_at;
    if (i.status === "accepted" && slotIso) {
      const slotStart = new Date(slotIso);
      const slotEnd = new Date(slotStart.getTime() + 90 * 60_000);
      const dayStart = new Date(slotStart);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const [{ data: cs }, { data: bs }, { data: cls }] = await Promise.all([
        supabase
          .from("courts")
          .select("id, name, surface, slot_minutes")
          .eq("tenant_id", i.tenant_id)
          .eq("is_active", true)
          .order("sort_order"),
        supabase
          .from("bookings")
          .select("court_id, starts_at, ends_at, status")
          .eq("tenant_id", i.tenant_id)
          .neq("status", "cancelada")
          .gte("starts_at", dayStart.toISOString())
          .lt("starts_at", dayEnd.toISOString()),
        supabase
          .from("coach_class_bookings")
          .select("court_id, starts_at, ends_at, status")
          .eq("tenant_id", i.tenant_id)
          .gte("starts_at", dayStart.toISOString())
          .lt("starts_at", dayEnd.toISOString()),
      ]);
      setCourts((cs ?? []) as CourtLite[]);
      const busy = new Set<string>();
      (bs ?? []).forEach((b: any) => {
        if (new Date(b.starts_at) < slotEnd && new Date(b.ends_at) > slotStart) busy.add(b.court_id);
      });
      (cls ?? []).forEach((c: any) => {
        if (
          c.status !== "cancelada" &&
          new Date(c.starts_at) < slotEnd &&
          new Date(c.ends_at) > slotStart
        )
          busy.add(c.court_id);
      });
      setBusyCourtIds(busy);
      // Preselect first available
      const firstFree = (cs ?? []).find((c: any) => !busy.has(c.id));
      setSelectedCourtId(firstFree?.id ?? null);
    }
    setLoading(false);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user]);

  // Realtime: refrescar si la reserva o la invitación cambian
  useEffect(() => {
    if (!inv) return;
    const ch = supabase
      .channel(`partner-match-${inv.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "match_invitations", filter: `id=eq.${inv.id}` },
        () => void load(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings", filter: `tenant_id=eq.${inv.tenant_id}` },
        () => void load(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inv?.id]);

  const confirmBooking = async () => {
    if (!inv || !selectedCourtId || !startsAt || !counterpart) return;
    setSubmitting(true);
    const { data: bookingData, error } = await supabase.rpc("create_booking", {
      _court_id: selectedCourtId,
      _starts_at: startsAt,
      _partner_user_id: counterpart.user_id,
      _notes: `Partner match: ${inv.message ?? ""}`.trim(),
      _duration_minutes: 90,
    } as any);
    if (error) {
      setSubmitting(false);
      toast({ title: "No se pudo reservar", description: error.message, variant: "destructive" });
      return;
    }
    const newBookingId = (bookingData as any)?.id ?? (bookingData as any) ?? null;
    if (newBookingId) {
      await supabase.from("match_invitations").update({ booking_id: newBookingId }).eq("id", inv.id);
    }
    setSubmitting(false);
    toast({ title: "¡Cancha reservada!", description: "Tu partido quedó confirmado." });
    void load();
  };

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </AppShell>
    );
  }

  if (!inv) {
    return (
      <AppShell>
        <div className="px-4 py-12 text-center text-sm text-muted-foreground">
          No encontramos esta invitación.
        </div>
      </AppShell>
    );
  }

  const isAccepted = inv.status === "accepted";
  const hasBooking = !!inv.booking_id;

  return (
    <AppShell>
      <div className="space-y-4 px-4 pb-10 pt-2">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Volver
        </button>

        {/* Hero: vs */}
        <div className="rounded-3xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-5 text-center">
          <Trophy className="mx-auto mb-2 h-6 w-6 text-primary" />
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Partner match
          </p>
          <div className="mt-3 flex items-center justify-center gap-3">
            <div className="flex flex-col items-center gap-1.5">
              <Avatar className="h-14 w-14 ring-2 ring-background">
                <AvatarFallback>
                  {initials(user?.user_metadata?.first_name as string, user?.user_metadata?.last_name as string)}
                </AvatarFallback>
              </Avatar>
              <span className="font-display text-xs">Tú</span>
            </div>
            <span className="font-display text-2xl font-semibold text-primary">vs</span>
            <div className="flex flex-col items-center gap-1.5">
              <Avatar className="h-14 w-14 ring-2 ring-background">
                <AvatarImage src={counterpart?.avatar_url ?? undefined} />
                <AvatarFallback>
                  {initials(counterpart?.first_name, counterpart?.last_name)}
                </AvatarFallback>
              </Avatar>
              <span className="font-display text-xs">
                {counterpart?.first_name ?? "Rival"}
              </span>
            </div>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "mt-4",
              isAccepted ? "border-success/40 text-success" : "border-warning/40 text-warning",
            )}
          >
            {isAccepted ? "Aceptado" : inv.status}
          </Badge>
        </div>

        {/* Horario */}
        {startsAtDate && (
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Horario acordado
            </p>
            <div className="mt-2 flex items-center gap-2 font-display text-base">
              <Clock className="h-4 w-4 text-primary" />
              {format(startsAtDate, "EEEE d 'de' MMMM · HH:mm 'h'", { locale: es })}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Duración estimada: 90 minutos</p>
          </div>
        )}

        {/* Cancha */}
        {isAccepted && !hasBooking && (
          <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Elige cancha y confirma
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Reservaremos a tu nombre con {counterpart?.first_name} como compañero.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {courts.map((c) => {
                const busy = busyCourtIds.has(c.id);
                const active = selectedCourtId === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    disabled={busy}
                    onClick={() => setSelectedCourtId(c.id)}
                    className={cn(
                      "rounded-xl border p-3 text-left text-xs transition-smooth",
                      busy
                        ? "border-border bg-muted/40 text-muted-foreground/50 line-through"
                        : active
                          ? "border-primary bg-primary/10 text-primary shadow-clay"
                          : "border-border bg-background hover:border-primary/40",
                    )}
                  >
                    <div className="flex items-center gap-1.5 font-semibold">
                      <MapPin className="h-3 w-3" />
                      {c.name}
                    </div>
                    <p className="mt-0.5 text-[10px] uppercase tracking-wide opacity-70">
                      {c.surface}
                    </p>
                    {busy && <p className="mt-1 text-[10px]">Ocupada</p>}
                  </button>
                );
              })}
            </div>
            {courts.length > 0 && busyCourtIds.size === courts.length && (
              <p className="rounded-xl border border-dashed border-border bg-muted/30 p-3 text-center text-xs text-muted-foreground">
                Todas las canchas están ocupadas a esa hora. Coordinen otro horario.
              </p>
            )}
            <Button
              variant="clay"
              className="w-full"
              disabled={!selectedCourtId || submitting}
              onClick={confirmBooking}
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <CalendarCheck className="mr-2 h-4 w-4" /> Confirmar reserva
                </>
              )}
            </Button>
          </div>
        )}

        {/* Reservado */}
        {hasBooking && startsAtDate && endsAtDate && (
          <div className="space-y-3 rounded-2xl border border-success/40 bg-success/5 p-4">
            <div className="flex items-center gap-2 text-success">
              <CalendarCheck className="h-5 w-5" />
              <p className="font-display text-sm font-semibold">Reserva confirmada</p>
            </div>
            <p className="text-xs text-muted-foreground">
              La cancha quedó reservada a tu nombre. La encuentras en Mis Reservas.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button asChild variant="outline" size="sm" className="flex-1">
                <Link to="/mis-reservas">Ver mis reservas</Link>
              </Button>
              <AddToCalendarButton
                title={`Tenis vs ${counterpart?.first_name ?? ""}`}
                startsAt={startsAtDate}
                endsAt={endsAtDate}
                description={inv.message ?? "Partner match"}
              />
            </div>
          </div>
        )}

        {!isAccepted && (
          <p className="rounded-2xl border border-dashed border-border bg-muted/20 p-4 text-center text-xs text-muted-foreground">
            La invitación aún no ha sido aceptada. Cuando se acepte podrás confirmar la cancha aquí.
          </p>
        )}
      </div>
    </AppShell>
  );
}
