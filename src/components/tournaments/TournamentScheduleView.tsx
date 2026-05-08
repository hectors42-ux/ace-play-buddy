import { useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarRange, Loader2, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  MATCH_STATUS_LABEL,
  matchStatusColor,
  roundLabel,
  totalRoundsForMatches,
} from "@/lib/tournament-utils";
import type { Tables } from "@/integrations/supabase/types";

type MatchRow = Tables<"tournament_matches">;
type RegRow = Pick<Tables<"tournament_registrations">, "id" | "player1_user_id" | "player2_user_id">;
type ProfileRow = Pick<Tables<"profiles">, "user_id" | "first_name" | "last_name">;
type CourtRow = Pick<Tables<"courts">, "id" | "name">;

interface Props {
  tournamentId: string;
  categoryId?: string;
}

const fmtDay = (iso: string) => format(parseISO(iso), "EEEE d 'de' MMMM", { locale: es });
const fmtTime = (iso: string) => format(parseISO(iso), "HH:mm");

const playerName = (regId: string | null, regs: Map<string, RegRow>, profiles: Map<string, ProfileRow>) => {
  if (!regId) return "Por definir";
  const r = regs.get(regId);
  if (!r) return "Por definir";
  const p1 = profiles.get(r.player1_user_id);
  const name1 = p1 ? `${p1.first_name} ${p1.last_name[0] ?? ""}.` : "Jugador";
  if (!r.player2_user_id) return name1;
  const p2 = profiles.get(r.player2_user_id);
  const name2 = p2 ? `${p2.first_name} ${p2.last_name[0] ?? ""}.` : "Jugador";
  return `${name1} / ${name2}`;
};

export const TournamentScheduleView = ({ tournamentId, categoryId }: Props) => {
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [regs, setRegs] = useState<RegRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [courts, setCourts] = useState<CourtRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dayFilter, setDayFilter] = useState<string>("all");
  const [courtFilter, setCourtFilter] = useState<string>("all");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      let q = supabase
        .from("tournament_matches")
        .select("*")
        .eq("tournament_id", tournamentId)
        .not("scheduled_at", "is", null)
        .order("scheduled_at", { ascending: true });
      if (categoryId) q = q.eq("category_id", categoryId);
      const { data: ms } = await q;
      if (cancelled) return;
      const matchList = (ms ?? []) as MatchRow[];
      setMatches(matchList);

      const regIds = Array.from(
        new Set(
          matchList.flatMap((m) => [m.registration_a_id, m.registration_b_id].filter(Boolean) as string[]),
        ),
      );
      const courtIds = Array.from(
        new Set(matchList.map((m) => m.court_id).filter(Boolean) as string[]),
      );

      const [regsRes, courtsRes] = await Promise.all([
        regIds.length
          ? supabase
              .from("tournament_registrations")
              .select("id, player1_user_id, player2_user_id")
              .in("id", regIds)
          : Promise.resolve({ data: [] as RegRow[] }),
        courtIds.length
          ? supabase.from("courts").select("id, name").in("id", courtIds)
          : Promise.resolve({ data: [] as CourtRow[] }),
      ]);
      if (cancelled) return;

      const regList = (regsRes.data ?? []) as RegRow[];
      setRegs(regList);
      setCourts((courtsRes.data ?? []) as CourtRow[]);

      const userIds = Array.from(
        new Set(
          regList.flatMap((r) => [r.player1_user_id, r.player2_user_id].filter(Boolean) as string[]),
        ),
      );
      if (userIds.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("user_id, first_name, last_name")
          .in("user_id", userIds);
        if (cancelled) return;
        setProfiles((profs ?? []) as ProfileRow[]);
      } else {
        setProfiles([]);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [tournamentId, categoryId]);

  const regsMap = useMemo(() => new Map(regs.map((r) => [r.id, r])), [regs]);
  const profilesMap = useMemo(() => new Map(profiles.map((p) => [p.user_id, p])), [profiles]);
  const courtsMap = useMemo(() => new Map(courts.map((c) => [c.id, c])), [courts]);
  const totalRounds = useMemo(() => totalRoundsForMatches(matches), [matches]);

  const grouped = useMemo(() => {
    const days: { dayKey: string; date: Date; items: MatchRow[] }[] = [];
    for (const m of matches) {
      if (!m.scheduled_at) continue;
      const d = parseISO(m.scheduled_at);
      const key = format(d, "yyyy-MM-dd");
      const found = days.find((x) => x.dayKey === key);
      if (found) found.items.push(m);
      else days.push({ dayKey: key, date: d, items: [m] });
    }
    return days;
  }, [matches]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (grouped.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center">
        <CalendarRange className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
        <p className="text-sm font-medium">Sin partidos programados</p>
        <p className="text-xs text-muted-foreground">Vuelve cuando se publique el cronograma.</p>
      </div>
    );
  }

  // Día N por orden de aparición
  const dayIndexByKey = new Map(grouped.map((g, i) => [g.dayKey, i + 1]));

  return (
    <div className="space-y-6">
      {grouped.map((day) => (
        <section key={day.dayKey} className="space-y-2">
          <header className="flex items-baseline gap-3">
            <h3 className="font-display text-lg font-semibold capitalize">{fmtDay(day.dayKey)}</h3>
            <span className="h-px flex-1 bg-border" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Día {dayIndexByKey.get(day.dayKey)}
            </span>
          </header>
          <ul className="space-y-2">
            {day.items.map((m) => {
              const court = m.court_id ? courtsMap.get(m.court_id) : null;
              const rl = roundLabel(m.round, totalRounds);
              return (
                <li
                  key={m.id}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-card"
                >
                  <div className="w-12 shrink-0 text-center">
                    <p className="font-display text-base font-semibold leading-none">
                      {m.scheduled_at ? fmtTime(m.scheduled_at) : "--:--"}
                    </p>
                    <p className="mt-0.5 text-[9px] uppercase tracking-wider text-muted-foreground">
                      {rl}
                    </p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {playerName(m.registration_a_id, regsMap, profilesMap)}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      vs {playerName(m.registration_b_id, regsMap, profilesMap)}
                    </p>
                    {court && (
                      <p className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                        <MapPin className="h-3 w-3" /> {court.name}
                      </p>
                    )}
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium",
                      matchStatusColor(m.status),
                    )}
                  >
                    {MATCH_STATUS_LABEL[m.status]}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
};
