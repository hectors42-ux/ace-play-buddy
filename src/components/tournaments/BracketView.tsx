import { useEffect, useRef, useState } from "react";
import { Trophy, CalendarClock, MapPin } from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Match, Registration, Player, Court, registrationLabel } from "@/hooks/useCategoryData";
import { roundLabel, formatScore, totalRoundsForMatches } from "@/lib/tournament-utils";
import { cn } from "@/lib/utils";

interface BracketViewProps {
  matches: Match[];
  registrations: Registration[];
  players: Map<string, Player>;
  courts?: Court[];
  highlightUserId?: string;
  onMatchClick?: (match: Match) => void;
}

// Constantes de layout (para conectores y espaciado)
const MATCH_HEIGHT = 110; // alto aprox por partido (2 filas + footer + meta)
const BASE_GAP = 14;
const COL_WIDTH = 240;
const COL_GAP = 28;
const ASSUMED_DURATION_MIN = 90; // duración asumida por partido para detectar "en vivo"

export const BracketView = ({
  matches,
  registrations,
  players,
  courts,
  highlightUserId,
  onMatchClick,
}: BracketViewProps) => {
  // tick para refrescar el estado "en vivo" cada 30s
  const [, setNowTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setNowTick((t) => t + 1), 30000);
    return () => clearInterval(id);
  }, []);

  if (matches.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card/50 p-6 text-center text-sm text-muted-foreground">
        La llave aún no ha sido generada.
      </div>
    );
  }

  const totalRounds = totalRoundsForMatches(matches);
  const regsById = new Map(registrations.map((r) => [r.id, r]));
  const courtsById = new Map((courts ?? []).map((c) => [c.id, c]));

  const byRound: Record<number, Match[]> = {};
  for (const m of matches) {
    (byRound[m.round] ||= []).push(m);
  }
  for (const r of Object.keys(byRound)) {
    byRound[Number(r)].sort((a, b) => a.bracket_position - b.bracket_position);
  }
  const rounds = Object.keys(byRound)
    .map(Number)
    .sort((a, b) => b - a);

  const isUserInReg = (regId: string | null) => {
    if (!highlightUserId || !regId) return false;
    const r = regsById.get(regId);
    if (!r) return false;
    return r.player1_user_id === highlightUserId || r.player2_user_id === highlightUserId;
  };

  const isLive = (m: Match): boolean => {
    if (!m.scheduled_at || m.status !== "programado") return false;
    const start = parseISO(m.scheduled_at).getTime();
    const end = start + ASSUMED_DURATION_MIN * 60 * 1000;
    const now = Date.now();
    return now >= start && now <= end;
  };

  const scrollRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{
    active: boolean;
    moved: boolean;
    startX: number;
    startY: number;
    scrollLeft: number;
    scrollTop: number;
    pointerId: number | null;
  }>({ active: false, moved: false, startX: 0, startY: 0, scrollLeft: 0, scrollTop: 0, pointerId: null });

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Solo arrastrar con mouse/pen; en touch dejamos el scroll nativo
    if (e.pointerType === "touch") return;
    const el = scrollRef.current;
    if (!el) return;
    dragState.current = {
      active: true,
      moved: false,
      startX: e.clientX,
      startY: e.clientY,
      scrollLeft: el.scrollLeft,
      scrollTop: el.scrollTop,
      pointerId: e.pointerId,
    };
    el.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const s = dragState.current;
    if (!s.active) return;
    const el = scrollRef.current;
    if (!el) return;
    const dx = e.clientX - s.startX;
    const dy = e.clientY - s.startY;
    if (!s.moved && Math.hypot(dx, dy) > 4) s.moved = true;
    el.scrollLeft = s.scrollLeft - dx;
    el.scrollTop = s.scrollTop - dy;
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const s = dragState.current;
    if (!s.active) return;
    const el = scrollRef.current;
    if (el && s.pointerId !== null && el.hasPointerCapture(s.pointerId)) {
      el.releasePointerCapture(s.pointerId);
    }
    s.active = false;
    s.pointerId = null;
  };

  const onClickCapture = (e: React.MouseEvent<HTMLDivElement>) => {
    // Evita que un drag dispare clicks en los partidos
    if (dragState.current.moved) {
      e.stopPropagation();
      e.preventDefault();
      dragState.current.moved = false;
    }
  };

  return (
    <div
      ref={scrollRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onClickCapture={onClickCapture}
      className="scrollbar-none overflow-auto overscroll-contain pb-2 max-h-[70vh] cursor-grab active:cursor-grabbing touch-pan-x touch-pan-y select-none"
      style={{ WebkitOverflowScrolling: "touch" }}
      role="region"
      aria-label="Llave del torneo"
    >
      <div className="flex min-w-max" style={{ gap: `${COL_GAP}px` }}>
        {rounds.map((r, colIdx) => {
          const stepFromFirst = totalRounds - r; // 0 = primera ronda
          const matchSlot = MATCH_HEIGHT * Math.pow(2, stepFromFirst);
          const gap = BASE_GAP * Math.pow(2, stepFromFirst);
          const paddingTop = colIdx === 0 ? 0 : (matchSlot - MATCH_HEIGHT) / 2;
          const isFinal = r === 1;
          return (
            <div
              key={r}
              className="relative flex shrink-0 snap-start flex-col"
              style={{ width: COL_WIDTH }}
            >
              <h4 className="mb-3 px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {roundLabel(r, totalRounds)}
                {isFinal && <span className="ml-1 text-primary">★</span>}
              </h4>
              <div
                className="relative flex flex-col"
                style={{
                  gap: `${gap}px`,
                  paddingTop: `${paddingTop}px`,
                }}
              >
                {byRound[r].map((m, idx) => {
                  const regA = m.registration_a_id ? regsById.get(m.registration_a_id) : undefined;
                  const regB = m.registration_b_id ? regsById.get(m.registration_b_id) : undefined;
                  const winnerIsA = m.winner_registration_id && m.winner_registration_id === m.registration_a_id;
                  const winnerIsB = m.winner_registration_id && m.winner_registration_id === m.registration_b_id;
                  const userInA = isUserInReg(m.registration_a_id);
                  const userInB = isUserInReg(m.registration_b_id);
                  const userInMatch = userInA || userInB;
                  const isPlayed = m.status === "jugado";
                  const live = isLive(m);
                  const court = m.court_id ? courtsById.get(m.court_id) : undefined;
                  // Conector hacia la siguiente columna (excepto en la final)
                  const showConnector = !isFinal;
                  const isUpper = idx % 2 === 0;
                  return (
                    <div key={m.id} className="relative">
                      <button
                        type="button"
                        onClick={() => onMatchClick?.(m)}
                        className={cn(
                          "flex w-full flex-col overflow-hidden rounded-2xl border bg-card text-left transition-smooth",
                          isPlayed
                            ? "border-emerald-500/40 shadow-card"
                            : live
                              ? "border-amber-500/60 ring-2 ring-amber-500/40 shadow-card"
                              : userInMatch
                                ? "border-primary/60 ring-1 ring-primary/30 shadow-card"
                                : "border-border",
                          onMatchClick && "hover:-translate-y-0.5 hover:shadow-clay focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                        )}
                        aria-label={`Partido ${m.bracket_position}, ronda ${roundLabel(m.round, totalRounds)}`}
                      >
                        <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/30 px-3 py-1.5">
                          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                            #{m.bracket_position}
                          </span>
                          {live && (
                            <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-700 dark:text-amber-400">
                              <span className="relative flex h-1.5 w-1.5">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-500 opacity-75" />
                                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-500" />
                              </span>
                              EN VIVO
                            </span>
                          )}
                          {!live && isPlayed && (
                            <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                              <Trophy className="h-3 w-3" /> Jugado
                            </span>
                          )}
                        </div>
                        <PlayerRow
                          label={registrationLabel(regA, players)}
                          isWinner={!!winnerIsA}
                          isUser={userInA}
                          isBye={!regA}
                          isLoserHighlight={isPlayed && !winnerIsA && !!regA}
                        />
                        <div className="h-px bg-border" />
                        <PlayerRow
                          label={registrationLabel(regB, players)}
                          isWinner={!!winnerIsB}
                          isUser={userInB}
                          isBye={!regB}
                          isLoserHighlight={isPlayed && !winnerIsB && !!regB}
                        />
                        {(m.scheduled_at || court || m.score) && (
                          <div className="border-t border-border bg-background/50 px-3 py-1.5 text-[10px] text-muted-foreground">
                            {m.score && (
                              <p className="font-mono">
                                {formatScore(m.score)}
                                {m.walkover && " · W.O."}
                                {m.retired && " · ret."}
                              </p>
                            )}
                            {!m.score && m.scheduled_at && (
                              <p className="flex items-center gap-1">
                                <CalendarClock className="h-3 w-3" />
                                {format(parseISO(m.scheduled_at), "EEE d MMM HH:mm", { locale: es })}
                                {court && (
                                  <>
                                    {" · "}
                                    <MapPin className="h-3 w-3" />
                                    {court.name}
                                  </>
                                )}
                              </p>
                            )}
                          </div>
                        )}
                      </button>

                      {showConnector && (
                        <>
                          {/* Línea horizontal saliente */}
                          <span
                            aria-hidden
                            className="absolute top-1/2 -translate-y-1/2 border-t border-border"
                            style={{
                              left: "100%",
                              width: COL_GAP / 2,
                            }}
                          />
                          {/* Línea vertical que une los dos partidos hermanos */}
                          <span
                            aria-hidden
                            className={cn(
                              "absolute border-border",
                              isUpper ? "border-r border-b" : "border-r border-t",
                            )}
                            style={{
                              left: `calc(100% + ${COL_GAP / 2}px)`,
                              ...(isUpper
                                ? { top: "50%", height: `calc(${matchSlot / 2}px + ${gap / 2}px)` }
                                : { bottom: "50%", height: `calc(${matchSlot / 2}px + ${gap / 2}px)` }),
                              width: 0,
                            }}
                          />
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const PlayerRow = ({
  label,
  isWinner,
  isUser,
  isBye,
  isLoserHighlight,
}: {
  label: string;
  isWinner: boolean;
  isUser: boolean;
  isBye: boolean;
  isLoserHighlight?: boolean;
}) => (
  <div
    className={cn(
      "flex items-center gap-2 px-3 py-2 text-xs",
      isWinner && "bg-emerald-500/10",
      isLoserHighlight && "opacity-60",
      isBye && "italic text-muted-foreground/60",
    )}
  >
    <span
      className={cn(
        "h-1.5 w-1.5 shrink-0 rounded-full transition-colors",
        isWinner ? "bg-emerald-500" : "bg-transparent",
      )}
    />
    <span
      className={cn(
        "flex-1 truncate",
        isWinner && "font-semibold text-foreground",
        isUser && !isWinner && "text-primary",
        isUser && isWinner && "text-emerald-700 dark:text-emerald-300",
      )}
    >
      {label}
    </span>
  </div>
);
