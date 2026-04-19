import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { addDays, format, parseISO, startOfDay } from "date-fns";
import { es } from "date-fns/locale";
import { ArrowLeft, CalendarDays, Loader2, X } from "lucide-react";
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
import { EmptyState } from "@/components/EmptyState";
import { BottomNav } from "@/components/BottomNav";
import { toast } from "sonner";
import {
  type BookingLite,
  type CourtLite,
  dayLabel,
  findBookingForSlot,
  formatSlotLabel,
  generateSlots,
  isSlotInPast,
} from "@/lib/booking-utils";
import { cn } from "@/lib/utils";

interface BookingRow extends BookingLite {
  user_id: string;
}

interface ProfileLite {
  user_id: string;
  first_name: string;
  last_name: string;
}

interface TournamentBookingMeta {
  category_name: string;
  player_a: string;
  player_b: string;
}

const Reservar = () => {
  const { user, profile } = useAuth();
  const { brand } = useClubBrand();

  const [courts, setCourts] = useState<CourtLite[]>([]);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileLite>>({});
  const [tournamentBookings, setTournamentBookings] = useState<Record<string, TournamentBookingMeta>>({});
  const [maxAdvanceDays, setMaxAdvanceDays] = useState(7);
  const [minCancelHours, setMinCancelHours] = useState(4);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<Date>(startOfDay(new Date()));
  const [pending, setPending] = useState<{ court: CourtLite; start: Date } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<BookingRow | null>(null);

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
    // Cargar nombres de quienes tienen reserva
    const userIds = Array.from(new Set(bs.map((b) => b.user_id)));
    if (userIds.length > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, first_name, last_name")
        .in("user_id", userIds);
      const map: Record<string, ProfileLite> = {};
      (profs ?? []).forEach((p) => {
        map[p.user_id] = p as ProfileLite;
      });
      setProfiles(map);
    } else {
      setProfiles({});
    }

    // Cargar metadatos de partidos de torneo asociados a estas reservas
    const bookingIds = bs.map((b) => b.id);
    if (bookingIds.length > 0) {
      const { data: matches } = await supabase
        .from("tournament_matches")
        .select(
          `booking_id,
           category:tournament_categories(name),
           reg_a:tournament_registrations!tournament_matches_registration_a_id_fkey(
             p1:profiles!tournament_registrations_player1_user_id_fkey(first_name,last_name),
             p2:profiles!tournament_registrations_player2_user_id_fkey(first_name,last_name)
           ),
           reg_b:tournament_registrations!tournament_matches_registration_b_id_fkey(
             p1:profiles!tournament_registrations_player1_user_id_fkey(first_name,last_name),
             p2:profiles!tournament_registrations_player2_user_id_fkey(first_name,last_name)
           )`,
        )
        .in("booking_id", bookingIds);
      const tmap: Record<string, TournamentBookingMeta> = {};
      const formatPlayer = (p1: any, p2: any) => {
        if (!p1) return "?";
        const a = `${p1.first_name} ${p1.last_name?.charAt(0) ?? ""}.`;
        if (!p2) return a;
        return `${a} / ${p2.first_name} ${p2.last_name?.charAt(0) ?? ""}.`;
      };
      (matches ?? []).forEach((m: any) => {
        if (!m.booking_id) return;
        tmap[m.booking_id] = {
          category_name: m.category?.name ?? "Torneo",
          player_a: formatPlayer(m.reg_a?.p1, m.reg_a?.p2),
          player_b: formatPlayer(m.reg_b?.p1, m.reg_b?.p2),
        };
      });
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

  const handleConfirm = async () => {
    if (!pending) return;
    setSubmitting(true);
    const { error } = await supabase.rpc("create_booking", {
      _court_id: pending.court.id,
      _starts_at: pending.start.toISOString(),
      _notes: null,
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message ?? "No se pudo crear la reserva");
      return;
    }
    toast.success("Reserva confirmada");
    setPending(null);
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
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Reservar cancha</p>
            <p className="font-display text-base font-semibold text-foreground">{brand.shortName}</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-5 px-5 py-5 pb-28">
        {/* Selector de día */}
        <section aria-label="Selector de fecha">
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
                    <span className="text-[10px] uppercase tracking-wider opacity-80">
                      {dayLabel(d)}
                    </span>
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
          <div className="space-y-4">
            {courts.map((court) => {
              const slots = generateSlots(court, selectedDay);
              return (
                <Card key={court.id} className="rounded-3xl border-border p-4 shadow-card">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <h2 className="font-display text-lg font-semibold text-foreground">
                        {court.name}
                      </h2>
                      <p className="text-xs capitalize text-muted-foreground">
                        {court.surface} · slots de {court.slot_minutes} min
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
                            className="flex flex-col items-center rounded-xl border border-dashed border-border/60 px-2 py-2 text-xs text-muted-foreground/50"
                          >
                            {formatSlotLabel(slot)}
                          </div>
                        );
                      }

                      if (booking) {
                        const tournamentMeta = tournamentBookings[booking.id];
                        const isTournament = !!tournamentMeta;
                        const cancellable = mine && !isTournament;
                        return (
                          <button
                            key={slot.toISOString()}
                            disabled={!cancellable}
                            onClick={() => cancellable && setCancelTarget(booking)}
                            className={cn(
                              "flex flex-col items-start rounded-xl px-2 py-2 text-left text-xs transition-smooth",
                              isTournament
                                ? "bg-accent/15 text-accent-foreground ring-1 ring-accent/40"
                                : mine
                                  ? "bg-primary text-primary-foreground shadow-clay hover:bg-primary/90"
                                  : "bg-muted text-muted-foreground",
                            )}
                          >
                            <span className="font-semibold">{formatSlotLabel(slot)}</span>
                            {isTournament ? (
                              <>
                                <span className="mt-0.5 truncate text-[10px] font-medium uppercase tracking-wider opacity-80">
                                  Torneo · {tournamentMeta.category_name}
                                </span>
                                <span className="truncate text-[10px] opacity-90">
                                  {tournamentMeta.player_a} vs {tournamentMeta.player_b}
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
                          </button>
                        );
                      }

                      return (
                        <button
                          key={slot.toISOString()}
                          onClick={() => setPending({ court, start: slot })}
                          className="flex flex-col items-center rounded-xl border border-border bg-card px-2 py-2 text-xs font-medium text-foreground transition-smooth hover:border-primary hover:bg-primary/5"
                        >
                          <span className="font-semibold">{formatSlotLabel(slot)}</span>
                          <span className="mt-0.5 text-[10px] text-success">Disponible</span>
                        </button>
                      );
                    })}
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        <p className="px-1 text-center text-[11px] text-muted-foreground">
          Cancela con al menos {minCancelHours}h de anticipación.
        </p>
      </main>

      {/* Confirmar reserva */}
      <Dialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle className="font-display">Confirmar reserva</DialogTitle>
            <DialogDescription>
              {pending && (
                <>
                  <span className="block text-foreground">
                    <strong>{pending.court.name}</strong> ({pending.court.surface})
                  </span>
                  <span className="block">
                    {format(pending.start, "EEEE d 'de' MMMM", { locale: es })}
                  </span>
                  <span className="block">
                    {formatSlotLabel(pending.start)} —{" "}
                    {format(
                      new Date(pending.start.getTime() + pending.court.slot_minutes * 60000),
                      "HH:mm",
                    )}
                  </span>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setPending(null)} disabled={submitting}>
              Cancelar
            </Button>
            <Button variant="clay" onClick={handleConfirm} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancelar reserva */}
      <Dialog open={!!cancelTarget} onOpenChange={(o) => !o && setCancelTarget(null)}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle className="font-display">¿Cancelar reserva?</DialogTitle>
            <DialogDescription>
              {cancelTarget && (
                <>
                  Tu reserva del {format(parseISO(cancelTarget.starts_at), "EEEE d 'de' MMMM 'a las' HH:mm", { locale: es })}{" "}
                  se eliminará y el horario quedará disponible para otros socios.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
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

      <BottomNav />
    </div>
  );
};

export default Reservar;
