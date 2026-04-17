import { addMinutes, format, isBefore, isSameDay, parseISO, set, startOfDay } from "date-fns";

export interface CourtLite {
  id: string;
  name: string;
  surface: string;
  slot_minutes: number;
  opens_at: string; // "HH:MM:SS"
  closes_at: string;
  is_active: boolean;
}

/**
 * Genera los horarios de inicio (Date locales) válidos para una cancha en un día dado.
 * Slots de tamaño slot_minutes desde opens_at hasta closes_at - slot_minutes.
 */
export function generateSlots(court: CourtLite, day: Date): Date[] {
  const [oh, om] = court.opens_at.split(":").map(Number);
  const [ch, cm] = court.closes_at.split(":").map(Number);
  const start = set(startOfDay(day), { hours: oh, minutes: om, seconds: 0, milliseconds: 0 });
  const end = set(startOfDay(day), { hours: ch, minutes: cm, seconds: 0, milliseconds: 0 });
  const slots: Date[] = [];
  let cursor = start;
  while (true) {
    const next = addMinutes(cursor, court.slot_minutes);
    if (next > end) break;
    slots.push(cursor);
    cursor = next;
  }
  return slots;
}

export function formatSlotLabel(d: Date): string {
  return format(d, "HH:mm");
}

export function isSlotInPast(slotStart: Date): boolean {
  return isBefore(slotStart, new Date());
}

export interface BookingLite {
  id: string;
  court_id: string;
  user_id: string;
  starts_at: string; // ISO
  ends_at: string;
  status: "confirmada" | "cancelada";
}

/** Devuelve la reserva confirmada que ocupa este slot exacto, si existe. */
export function findBookingForSlot(
  bookings: BookingLite[],
  courtId: string,
  slotStart: Date,
): BookingLite | undefined {
  return bookings.find((b) => {
    if (b.court_id !== courtId || b.status !== "confirmada") return false;
    const bs = parseISO(b.starts_at);
    return bs.getTime() === slotStart.getTime();
  });
}

export const dayLabel = (d: Date): string => {
  const today = new Date();
  if (isSameDay(d, today)) return "Hoy";
  if (isSameDay(d, addMinutes(today, 60 * 24))) return "Mañana";
  return format(d, "EEE d MMM");
};
