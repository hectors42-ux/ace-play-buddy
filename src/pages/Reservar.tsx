import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { addDays, addMinutes, format, parseISO, startOfDay } from "date-fns";
import { es } from "date-fns/locale";
import { ArrowLeft, CalendarDays, Clock, Loader2, MapPin, Sun, Sunset, Moon, X } from "lucide-react";
import { PartnerPicker } from "@/components/PartnerPicker";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/providers/AuthProvider";
import { useClubBrand } from "@/components/providers/ClubBrandProvider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/EmptyState";
import { BottomNav } from "@/components/BottomNav";
import { ScheduleDialog } from "@/components/tournaments/ScheduleDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Court as TournamentCourt, Match as TournamentMatch } from "@/hooks/useCategoryData";
import { toast } from "sonner";
import {
  areConsecutiveSlotsFree,
  type BookingLite,
  type CourtLite,
  dayLabel,
  findBookingForSlot,
  formatSlotLabel,
  generateSlots,
  groupCourtsBySurface,
  isSlotInPast,
} from "@/lib/booking-utils";
import { cn } from "@/lib/utils";
import { AddToCalendarButton } from "@/components/shared/AddToCalendarButton";

interface BookingRow extends BookingLite {
  user_id: string;
}

interface ProfileLite {
  user_id: string;
  first_name: string;
  last_name: string;
}

interface TournamentBookingMeta {
  match_id: string;
  category_name: string;
  category_id: string;
  tournament_slug: string;
  tournament_name: string;
  round: number;
  match_status: string;
  scheduled_at: string | null;
  player_a: string;
  player_b: string;
  is_mine: boolean;
}

type Duration = 60 | 90 | 120;
const DURATIONS: Duration[] = [60, 90, 120];

const Reservar = () => {
  const { user, profile, isAdmin } = useAuth();
  const { brand } = useClubBrand();

  const [courts, setCourts] = useState<CourtLite[]>([]);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileLite>>({});
  const [tournamentBookings, setTournamentBookings] = useState<Record<string, TournamentBookingMeta>>({});
  const [maxAdvanceDays, setMaxAdvanceDays] = useState(7);
  const [minCancelHours, setMinCancelHours] = useState(4);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<Date>(startOfDay(new Date()));
  const [duration, setDuration] = useState<Duration>(60);
  const [selectedSlot, setSelectedSlot] = useState<Date | null>(null);
  const [pending, setPending] = useState<{ court: CourtLite; start: Date; duration: Duration } | null>(null);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<BookingRow | null>(null);
  const [rescheduleMatch, setRescheduleMatch] = useState<TournamentMatch | null>(null);
  const [tournamentCancelTarget, setTournamentCancelTarget] = useState<{
    booking: BookingRow;
    meta: TournamentBookingMeta;
  } | null>(null);
  const [tournamentCancelMode, setTournamentCancelMode] = useState<"unschedule" | "cancel_match">("unschedule");

  // Reset selected slot when day or duration changes
  useEffect(() => {
    setSelectedSlot(null);
  }, [selectedDay, duration]);

  const tenantId = profile?.tenant_id;

  const loadAll = async () => {
    if (!tenantId) return;
    setLoading(true);
    const dayStart = startOfDay(selectedDay).toISOString();
    const dayEnd = startOfDay(addDays(selectedDay, 1)).toISOString();
    const [courtsRes, bookingsRes, rulesRes] = await Promise.all([
      supabase
        .from("courts")
        .select("id, name, surface, slot_minutes, opens_at, closes_at, is_active")
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .order("sort_order"),
      supabase
        .from("bookings")
        .select("id, court_id, user_id, starts_at, ends_at, status")
        .eq("tenant_id", tenantId)
        .eq("status", "confirmada")
        .gte("starts_at", dayStart)
        .lt("starts_at", dayEnd),
      supabase
        .from("booking_rules")
        .select("max_advance_days, min_cancel_hours")
        .eq("tenant_id", tenantId)
        .maybeSingle(),
    ]);
    const cs = (courtsRes.data ?? []) as CourtLite[];
    const bs = (bookingsRes.data ?? []) as BookingRow[];
    setCourts(cs);
    setBookings(bs);
    if (rulesRes.data) {
      setMaxAdvanceDays(rulesRes.data.max_advance_days ?? 7);
      setMinCancelHours(rulesRes.data.min_cancel_hours ?? 4);
    }
    const userIds = Array.from(new Set(bs.map((b) => b.user_id)));
    const map: Record<string, ProfileLite> = {};
    if (userIds.length > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, first_name, last_name")
        .in("user_id", userIds);
      (profs ?? []).forEach((p) => {
        map[p.user_id] = p as ProfileLite;
      });
      setProfiles(map);
    } else {
      setProfiles({});
    }

    const bookingIds = bs.map((b) => b.id);
    if (bookingIds.length > 0) {
      const { data: matches } = await supabase
        .from("tournament_matches")
        .select(
          "id, booking_id, registration_a_id, registration_b_id, round, status, scheduled_at, category_id, category:tournament_categories(name), tournament:tournaments(slug, name)",
        )
        .in("booking_id", bookingIds);
      const regIds = Array.from(
        new Set(
          (matches ?? [])
            .flatMap((m: any) => [m.registration_a_id, m.registration_b_id])
            .filter(Boolean) as string[],
        ),
      );
      const regMap: Record<string, { p1?: string; p2?: string }> = {};
      const playerIds = new Set<string>();
      if (regIds.length > 0) {
        const { data: regs } = await supabase
          .from("tournament_registrations")
          .select("id, player1_user_id, player2_user_id")
          .in("id", regIds);
        (regs ?? []).forEach((r) => {
          regMap[r.id] = { p1: r.player1_user_id, p2: r.player2_user_id ?? undefined };
          if (r.player1_user_id) playerIds.add(r.player1_user_id);
          if (r.player2_user_id) playerIds.add(r.player2_user_id);
        });
      }
      const playerMap: Record<string, ProfileLite> = {};
      const missing = Array.from(playerIds).filter((id) => !map[id]);
      if (missing.length > 0) {
        const { data: extraProfs } = await supabase
          .from("profiles")
          .select("user_id, first_name, last_name")
          .in("user_id", missing);
        (extraProfs ?? []).forEach((p) => {
          playerMap[p.user_id] = p as ProfileLite;
        });
      }
      const allProfiles = { ...map, ...playerMap };
      const fmt = (uid?: string) => {
        if (!uid) return null;
        const p = allProfiles[uid];
        return p ? `${p.first_name} ${p.last_name.charAt(0)}.` : "Jugador";
      };
      const tmap: Record<string, TournamentBookingMeta> = {};
      (matches ?? []).forEach((m: any) => {
        if (!m.booking_id) return;
        const ra = regMap[m.registration_a_id];
        const rb = regMap[m.registration_b_id];
        const aLabel = ra ? [fmt(ra.p1), fmt(ra.p2)].filter(Boolean).join(" / ") : "?";
        const bLabel = rb ? [fmt(rb.p1), fmt(rb.p2)].filter(Boolean).join(" / ") : "?";
        const meUid = user?.id;
        const isMine = !!meUid && [ra?.p1, ra?.p2, rb?.p1, rb?.p2].includes(meUid);
        tmap[m.booking_id] = {
          match_id: m.id,
          category_name: m.category?.name ?? "Torneo",
          category_id: m.category_id,
          tournament_slug: m.tournament?.slug ?? "",
          tournament_name: m.tournament?.name ?? "Torneo",
          round: m.round,
          match_status: m.status,
          scheduled_at: m.scheduled_at,
          player_a: aLabel || "?",
          player_b: bLabel || "?",
          is_mine: isMine,
        };
      });
      if (Object.keys(playerMap).length > 0) {
        setProfiles((prev) => ({ ...prev, ...playerMap }));
      }
      setTournamentBookings(tmap);
    } else {
      setTournamentBookings({});
    }
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, selectedDay]);

  const days = useMemo(() => {
    const today = startOfDay(new Date());
    return Array.from({ length: maxAdvanceDays + 1 }, (_, i) => addDays(today, i));
  }, [maxAdvanceDays]);

  const groupedCourts = useMemo(() => groupCourtsBySurface(courts), [courts]);

  const handleSlotClick = (court: CourtLite, slot: Date) => {
    if (duration > court.slot_minutes) {
      const ok = areConsecutiveSlotsFree(bookings, court, slot, duration);
      if (!ok) {
        const extra = duration - court.slot_minutes;
        toast.error(`Los siguientes ${extra} min no están libres en esta cancha`);
        return;
      }
    }
    setPending({ court, start: slot, duration });
  };

  const handleConfirm = async () => {
    if (!pending) return;
    if (!partnerId) {
      toast.error("Selecciona un compañero/a para reservar");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.rpc("create_booking", {
      _court_id: pending.court.id,
      _starts_at: pending.start.toISOString(),
      _partner_user_id: partnerId,
      _notes: undefined,
      _duration_minutes: pending.duration,
    } as any);
    setSubmitting(false);
    if (error) {
      toast.error(error.message ?? "No se pudo crear la reserva");
      return;
    }
    toast.success("Reserva confirmada");
    setPending(null);
    setPartnerId(null);
    await loadAll();
  };

  const handleCancel = async () => {
    if (!cancelTarget) return;
    setSubmitting(true);
    const { error } = await supabase.rpc("cancel_booking", { _booking_id: cancelTarget.id });
    setSubmitting(false);
    if (error) {
      toast.error(error.message ?? "No se pudo cancelar");
      return;
    }
    toast.success("Reserva cancelada");
    setCancelTarget(null);
    await loadAll();
  };

  const handleTournamentCancel = async () => {
    if (!tournamentCancelTarget) return;
    const { meta } = tournamentCancelTarget;
    setSubmitting(true);
    const { error: unschedErr } = await supabase.rpc("unschedule_match", { _match_id: meta.match_id });
    if (unschedErr) {
      setSubmitting(false);
      toast.error(unschedErr.message ?? "No se pudo liberar la cancha");
      return;
    }
    if (tournamentCancelMode === "cancel_match") {
      const { error: cancelErr } = await supabase
        .from("tournament_matches")
        .update({ status: "cancelado" })
        .eq("id", meta.match_id);
      if (cancelErr) {
        setSubmitting(false);
        toast.error(cancelErr.message ?? "Cancha liberada, pero no se pudo marcar el partido como cancelado");
        return;
      }
    }
    setSubmitting(false);
    toast.success(
      tournamentCancelMode === "cancel_match"
        ? "Partido cancelado y cancha liberada"
        : "Cancha liberada · partido vuelve a 'pendiente'",
    );
    setTournamentCancelTarget(null);
    setTournamentCancelMode("unschedule");
    await loadAll();
  };

  const courtsForDialog = courts as unknown as TournamentCourt[];

  const renderCourtCard = (court: CourtLite) => {
    const slots = generateSlots(court, selectedDay);
    return (
      <Card key={court.id} className="rounded-3xl border-border p-4 shadow-card">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="font-display text-base font-semibold text-foreground">{court.name}</h3>
            <p className="text-[11px] capitalize text-muted-foreground">
              {court.surface} · slots {court.slot_minutes} min
            </p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
          {slots.map((slot) => {
            const past = isSlotInPast(slot);
            const booking = findBookingForSlot(bookings, court.id, slot);
            const mine = booking?.user_id === user?.id;
            const occupant = booking ? profiles[booking.user_id] : undefined;

            if (past && !booking) {
              return (
                <div
                  key={slot.toISOString()}
                  className="flex flex-col items-center rounded-xl border border-dashed border-border/60 px-2 py-2 text-xs text-muted-foreground/50 line-through"
                >
                  {formatSlotLabel(slot)}
                </div>
              );
            }

            if (booking) {
              const tournamentMeta = tournamentBookings[booking.id];
              const isTournament = !!tournamentMeta;
              const isMyTournament = isTournament && tournamentMeta.is_mine;
              const cancellable = mine && !isTournament;

              const slotInner = (
                <>
                  <span className="font-semibold">{formatSlotLabel(slot)}</span>
                  {isTournament ? (
                    <>
                      <span
                        className={cn(
                          "mt-0.5 truncate text-[10px] font-medium uppercase tracking-wider",
                          isMyTournament ? "text-primary" : "opacity-80",
                        )}
                      >
                        {isMyTournament ? "Tu partido" : "Torneo"} · {tournamentMeta!.category_name}
                      </span>
                      <span className="truncate text-[10px] opacity-90">
                        {tournamentMeta!.player_a} vs {tournamentMeta!.player_b}
                      </span>
                    </>
                  ) : (
                    <span className="mt-0.5 truncate text-[10px] opacity-90">
                      {mine
                        ? "Tu reserva"
                        : occupant
                          ? `${occupant.first_name} ${occupant.last_name.charAt(0)}.`
                          : "Reservado"}
                    </span>
                  )}
                </>
              );

              const slotClass = cn(
                "flex w-full flex-col items-start rounded-xl px-2 py-2 text-left text-xs transition-smooth",
                isMyTournament
                  ? "bg-primary/15 text-foreground ring-1 ring-primary/50 hover:bg-primary/20"
                  : isTournament
                    ? "bg-accent/15 text-accent-foreground ring-1 ring-accent/40 hover:bg-accent/25"
                    : mine
                      ? "bg-primary text-primary-foreground shadow-clay hover:bg-primary/90"
                      : "bg-muted text-muted-foreground line-through decoration-muted-foreground/40",
              );

              if (isTournament) {
                const meta = tournamentMeta!;
                const statusLabel: Record<string, string> = {
                  programado: "Programado",
                  jugado: "Jugado",
                  pendiente: "Pendiente",
                  walkover: "Walkover",
                  cancelado: "Cancelado",
                };
                return (
                  <Popover key={slot.toISOString()}>
                    <PopoverTrigger asChild>
                      <button type="button" className={slotClass}>
                        {slotInner}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-72 rounded-2xl p-4" align="start">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                              {meta.tournament_name}
                            </p>
                            <p className="font-display text-base font-semibold leading-tight text-foreground">
                              {meta.category_name}
                            </p>
                          </div>
                          <Badge
                            variant={meta.match_status === "jugado" ? "secondary" : "default"}
                            className="shrink-0 text-[10px]"
                          >
                            {statusLabel[meta.match_status] ?? meta.match_status}
                          </Badge>
                        </div>

                        <div className="space-y-1 text-xs text-muted-foreground">
                          <p>
                            <span className="font-medium text-foreground">Ronda:</span> {meta.round}
                          </p>
                          <p>
                            <span className="font-medium text-foreground">Cancha:</span> {court.name}
                          </p>
                          <p>
                            <span className="font-medium text-foreground">Hora:</span>{" "}
                            {meta.scheduled_at
                              ? format(parseISO(meta.scheduled_at), "EEEE d MMM · HH:mm", { locale: es })
                              : formatSlotLabel(slot)}
                          </p>
                        </div>

                        <div className="rounded-xl bg-muted/50 p-2 text-xs">
                          <p className={cn("truncate", isMyTournament && "font-semibold text-primary")}>
                            {meta.player_a}
                          </p>
                          <p className="my-0.5 text-center text-[10px] uppercase tracking-wider text-muted-foreground">
                            vs
                          </p>
                          <p className={cn("truncate", isMyTournament && "font-semibold text-primary")}>
                            {meta.player_b}
                          </p>
                        </div>

                        {meta.tournament_slug && (
                          <Link
                            to={`/torneos/${meta.tournament_slug}/cat/${meta.category_id}`}
                            className="block w-full rounded-xl bg-primary px-3 py-2 text-center text-xs font-semibold text-primary-foreground transition-smooth hover:bg-primary/90"
                          >
                            Ver detalle del torneo
                          </Link>
                        )}

                        {isAdmin && meta.match_status !== "jugado" && meta.match_status !== "cancelado" && (
                          <div className="space-y-1.5 border-t border-border pt-3">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                              Acciones admin
                            </p>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 w-full text-xs"
                              onClick={() =>
                                setRescheduleMatch({
                                  id: meta.match_id,
                                  scheduled_at: meta.scheduled_at,
                                } as TournamentMatch)
                              }
                            >
                              Reprogramar
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              className="h-8 w-full text-xs"
                              onClick={() => {
                                setTournamentCancelMode("unschedule");
                                setTournamentCancelTarget({ booking, meta });
                              }}
                            >
                              Cancelar booking
                            </Button>
                          </div>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                );
              }

              return (
                <button
                  key={slot.toISOString()}
                  disabled={!cancellable}
                  onClick={() => cancellable && setCancelTarget(booking)}
                  className={slotClass}
                >
                  {slotInner}
                </button>
              );
            }

            // Disponible: validar si la duración cabe (visualmente bloqueamos si no)
            const fits = duration <= court.slot_minutes
              ? true
              : areConsecutiveSlotsFree(bookings, court, slot, duration);

            return (
              <button
                key={slot.toISOString()}
                onClick={() => handleSlotClick(court, slot)}
                disabled={!fits}
                className={cn(
                  "flex flex-col items-center rounded-xl border px-2 py-2 text-xs font-medium transition-smooth",
                  fits
                    ? "border-border bg-card text-foreground hover:border-primary hover:bg-primary/5"
                    : "cursor-not-allowed border-dashed border-border/60 bg-muted/40 text-muted-foreground/50",
                )}
              >
                <span className="font-semibold">{formatSlotLabel(slot)}</span>
                <span className={cn("mt-0.5 text-[10px]", fits ? "text-success" : "text-muted-foreground/50")}>
                  {fits ? "Disponible" : "No cabe"}
                </span>
              </button>
            );
          })}
        </div>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-warm">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-xl safe-top">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-3">
          <Link
            to="/"
            className="flex items-center gap-2 rounded-xl px-2 py-1 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Inicio
          </Link>
          <div className="flex items-center gap-2 text-right">
            <Badge variant="secondary" className="rounded-full text-[10px] uppercase tracking-wider">
              {dayLabel(selectedDay)} · {duration} min
            </Badge>
            <div>
              <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Reservar cancha</p>
              <p className="font-display text-base font-semibold text-foreground">{brand.shortName}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 px-5 py-5 pb-28">
        {/* PASO 1 — Día */}
        <section aria-label="Selector de fecha" className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              1 · Elige día
            </p>
            <p className="text-[10px] text-muted-foreground">Hasta {maxAdvanceDays} días</p>
          </div>
          <div className="-mx-5 overflow-x-auto px-5 pb-1">
            <div className="flex gap-2">
              {days.map((d) => {
                const active = d.getTime() === selectedDay.getTime();
                return (
                  <button
                    key={d.toISOString()}
                    onClick={() => setSelectedDay(d)}
                    className={cn(
                      "flex min-w-[68px] flex-col items-center rounded-2xl border px-3 py-2 text-xs transition-smooth",
                      active
                        ? "border-primary bg-primary text-primary-foreground shadow-clay"
                        : "border-border bg-card text-foreground hover:bg-muted",
                    )}
                  >
                    <span className="text-[10px] uppercase tracking-wider opacity-80">{dayLabel(d)}</span>
                    <span className="font-display text-lg font-semibold leading-tight">
                      {format(d, "d", { locale: es })}
                    </span>
                    <span className="text-[10px] capitalize opacity-80">
                      {format(d, "MMM", { locale: es })}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* PASO 2 — Duración */}
        <section aria-label="Selector de duración" className="space-y-2">
          <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            2 · Duración
          </p>
          <div className="grid grid-cols-3 gap-2">
            {DURATIONS.map((d) => {
              const active = duration === d;
              return (
                <button
                  key={d}
                  onClick={() => setDuration(d)}
                  className={cn(
                    "flex flex-col items-center rounded-2xl border px-3 py-3 text-sm transition-smooth",
                    active
                      ? "border-primary bg-primary text-primary-foreground shadow-clay"
                      : "border-border bg-card text-foreground hover:bg-muted",
                  )}
                >
                  <span className="font-display text-lg font-bold leading-tight">{d}</span>
                  <span className="text-[10px] uppercase tracking-wider opacity-80">minutos</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* PASO 3 — Canchas agrupadas */}
        <section aria-label="Canchas disponibles" className="space-y-4">
          <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            3 · Canchas
          </p>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : courts.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="Sin canchas disponibles"
              description="Tu club aún no tiene canchas configuradas."
            />
          ) : (
            <div className="space-y-6">
              {groupedCourts.map((group) => (
                <div key={group.key} className="space-y-3">
                  <div className="flex items-center gap-2 px-1">
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                        group.badgeClass,
                      )}
                    >
                      {group.label}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {group.courts.length} {group.courts.length === 1 ? "cancha" : "canchas"}
                    </span>
                  </div>
                  <div className="grid gap-3 lg:grid-cols-2">
                    {group.courts.map(renderCourtCard)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <p className="px-1 text-center text-[11px] text-muted-foreground">
          Cancela con al menos {minCancelHours}h de anticipación.
        </p>
      </main>

      {/* Confirmar reserva */}
      <Dialog
        open={!!pending}
        onOpenChange={(o) => {
          if (!o) {
            setPending(null);
            setPartnerId(null);
          }
        }}
      >
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle className="font-display">Confirmar reserva</DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-1">
                {pending && (
                  <>
                    <p className="text-foreground">
                      <strong>{pending.court.name}</strong> · {pending.court.surface}
                    </p>
                    <p>
                      {format(pending.start, "EEEE d 'de' MMMM", { locale: es })} ·{" "}
                      {formatSlotLabel(pending.start)}—
                      {format(addMinutes(pending.start, pending.duration), "HH:mm")}
                      {" · "}
                      <span className="font-medium text-foreground">{pending.duration} min</span>
                    </p>
                  </>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Compañero/a · obligatorio
            </label>
            <PartnerPicker value={partnerId} onChange={(id) => setPartnerId(id)} />
            <p className="text-[11px] text-muted-foreground">
              Toda reserva requiere otro socio del club. La cancha quedará bloqueada para ambos.
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setPending(null);
                setPartnerId(null);
              }}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button variant="clay" onClick={handleConfirm} disabled={submitting || !partnerId}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar reserva"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancelar reserva */}
      <Dialog open={!!cancelTarget} onOpenChange={(o) => !o && setCancelTarget(null)}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle className="font-display">Tu reserva</DialogTitle>
            <DialogDescription>
              {cancelTarget && (
                <>
                  {format(parseISO(cancelTarget.starts_at), "EEEE d 'de' MMMM 'a las' HH:mm", { locale: es })}
                  {" · "}
                  {courts.find((c) => c.id === cancelTarget.court_id)?.name ?? "cancha"}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {cancelTarget && (
            <div className="flex justify-center pb-2">
              <AddToCalendarButton
                title={`Reserva · ${courts.find((c) => c.id === cancelTarget.court_id)?.name ?? "cancha"}`}
                description="Reserva confirmada"
                location={courts.find((c) => c.id === cancelTarget.court_id)?.name}
                startsAt={cancelTarget.starts_at}
                endsAt={cancelTarget.ends_at}
                filename={`reserva-${cancelTarget.id}.ics`}
              />
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setCancelTarget(null)} disabled={submitting}>
              Volver
            </Button>
            <Button variant="destructive" onClick={handleCancel} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><X className="h-4 w-4" /> Cancelar reserva</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reagendar partido (admin) */}
      <ScheduleDialog
        open={!!rescheduleMatch}
        onOpenChange={(o) => !o && setRescheduleMatch(null)}
        match={rescheduleMatch}
        courts={courtsForDialog}
        mode="reschedule_admin"
        onScheduled={() => {
          setRescheduleMatch(null);
          loadAll();
        }}
      />

      {/* Cancelar booking de torneo (admin) */}
      <AlertDialog
        open={!!tournamentCancelTarget}
        onOpenChange={(o) => {
          if (!o) {
            setTournamentCancelTarget(null);
            setTournamentCancelMode("unschedule");
          }
        }}
      >
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">Cancelar booking de torneo</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm text-muted-foreground">
                {tournamentCancelTarget && (
                  <p>
                    <span className="font-medium text-foreground">
                      {tournamentCancelTarget.meta.category_name}
                    </span>{" "}
                    · {tournamentCancelTarget.meta.player_a} vs {tournamentCancelTarget.meta.player_b}
                  </p>
                )}
                <p>Elige qué hacer con el partido:</p>
                <div className="space-y-2">
                  <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-border p-3 transition-smooth hover:bg-muted/50 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                    <input
                      type="radio"
                      name="cancel-mode"
                      value="unschedule"
                      checked={tournamentCancelMode === "unschedule"}
                      onChange={() => setTournamentCancelMode("unschedule")}
                      className="mt-0.5 accent-primary"
                    />
                    <span className="text-xs text-foreground">
                      <span className="font-semibold">Solo liberar cancha</span>
                      <br />
                      <span className="text-muted-foreground">
                        El partido vuelve a estado &quot;pendiente&quot; y deberá reprogramarse.
                      </span>
                    </span>
                  </label>
                  <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-border p-3 transition-smooth hover:bg-muted/50 has-[:checked]:border-destructive has-[:checked]:bg-destructive/5">
                    <input
                      type="radio"
                      name="cancel-mode"
                      value="cancel_match"
                      checked={tournamentCancelMode === "cancel_match"}
                      onChange={() => setTournamentCancelMode("cancel_match")}
                      className="mt-0.5 accent-destructive"
                    />
                    <span className="text-xs text-foreground">
                      <span className="font-semibold">Cancelar partido completo</span>
                      <br />
                      <span className="text-muted-foreground">
                        El partido queda marcado como &quot;cancelado&quot; y no se jugará.
                      </span>
                    </span>
                  </label>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Volver</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleTournamentCancel();
              }}
              disabled={submitting}
              className={cn(
                tournamentCancelMode === "cancel_match" &&
                  "bg-destructive text-destructive-foreground hover:bg-destructive/90",
              )}
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : tournamentCancelMode === "cancel_match" ? (
                "Cancelar partido"
              ) : (
                "Liberar cancha"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BottomNav />
    </div>
  );
};

export default Reservar;
