import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Check, X, Sparkles, GraduationCap, Settings2, Clock } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatLevel, formatDelta, getDeltaColor } from "@/lib/rating-utils";
import { cn } from "@/lib/utils";
import type { ProfileSummaryRecentMatch } from "@/hooks/useUserProfileSummary";

const SOURCE_LABEL: Record<string, string> = {
  ladder_challenge: "Pirámide",
  match_ladder: "Pirámide",
  tournament_match: "Torneo",
  match_tournament: "Torneo",
  match_open: "Amistoso",
  clase: "Clase",
  manual_admin: "Ajuste",
  manual_self: "Ajuste",
  decay: "Inactividad",
  onboarding: "Test inicial",
};

interface Props {
  matches: ProfileSummaryRecentMatch[];
  meName: string;
  meAvatar?: string | null;
  meLevel?: number | null;
  /** Tarjetas por slide en mobile (default 1.15 → muestra una y un asomo de la siguiente). */
  basis?: string;
}

const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase() || "?";

/** Parsea "6-3, 4-6, 7-5" → [["6","3"],["4","6"],["7","5"]] */
const parseScore = (s?: string | null): Array<[string, string]> => {
  if (!s) return [];
  return s
    .split(",")
    .map((p) => p.trim().split("-"))
    .filter((p) => p.length === 2)
    .map(([a, b]) => [a, b] as [string, string]);
};

/** Fuentes que NO son partidos contra otro socio (no mostrar fila de rival). */
const NON_VERSUS_SOURCES = new Set([
  "clase",
  "onboarding",
  "manual_admin",
  "manual_self",
  "decay",
]);

/** Metadata visual para tarjetas de ajuste (sin contrincante). */
const ADJUSTMENT_META: Record<string, { icon: typeof Sparkles; title: string; subtitle: string }> = {
  clase: {
    icon: GraduationCap,
    title: "Clase con coach",
    subtitle: "Ajuste de nivel por entrenamiento",
  },
  onboarding: {
    icon: Sparkles,
    title: "Test inicial",
    subtitle: "Nivel asignado al ingresar",
  },
  manual_admin: {
    icon: Settings2,
    title: "Ajuste administrativo",
    subtitle: "Modificación realizada por el club",
  },
  manual_self: {
    icon: Settings2,
    title: "Ajuste propio",
    subtitle: "Recalibración manual de nivel",
  },
  decay: {
    icon: Clock,
    title: "Inactividad",
    subtitle: "Ajuste por falta de partidos",
  },
};

const MatchCard = ({
  m,
  meName,
  meAvatar,
  meLevel,
}: {
  m: ProfileSummaryRecentMatch;
  meName: string;
  meAvatar?: string | null;
  meLevel?: number | null;
}) => {
  const sets = parseScore(m.score_summary);
  const hasOpponent = !NON_VERSUS_SOURCES.has(m.source) && !!m.opponent_name;
  const opponentName = m.opponent_name ?? "Rival";
  const Icon = m.won ? Check : X;
  const sourceLabel = SOURCE_LABEL[m.source] ?? m.source;
  const dateLabel = format(new Date(m.recorded_at), "d MMM yyyy", { locale: es });
  const adjustment = !hasOpponent ? ADJUSTMENT_META[m.source] ?? ADJUSTMENT_META.manual_admin : null;
  const AdjustmentIcon = adjustment?.icon ?? Settings2;

  return (
    <div className="flex flex-col rounded-2xl border border-border bg-card p-2.5 shadow-card sm:p-3">
      {/* Header: fecha y origen — compacto */}
      <div className="mb-1.5 flex h-4 items-center justify-between text-[9px] font-medium uppercase tracking-wide leading-none text-muted-foreground sm:text-[10px]">
        <span>{dateLabel}</span>
        <span className="rounded-full bg-muted px-1.5 py-0.5 leading-none">{sourceLabel}</span>
      </div>

      {adjustment ? (
        /* === Layout SIN contrincante: ajuste de nivel === */
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <AdjustmentIcon className="h-6 w-6" strokeWidth={2} />
          </div>
          <div className="space-y-0.5">
            <p className="text-sm font-semibold leading-tight">{adjustment.title}</p>
            <p className="text-[10px] leading-tight text-muted-foreground">{adjustment.subtitle}</p>
          </div>
          <span className="mt-1 inline-flex items-center gap-1 rounded-full border border-dashed border-border bg-muted/40 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Sin contrincante
          </span>
        </div>
      ) : (
        /* === Layout CON contrincante: partido === */
        <>
          <div className="space-y-1">
            {/* Yo */}
            <div className="flex items-center gap-1.5">
              <Avatar className="h-6 w-6 sm:h-7 sm:w-7">
                <AvatarImage src={meAvatar ?? undefined} />
                <AvatarFallback className="text-[10px]">{initials(meName)}</AvatarFallback>
              </Avatar>
              <span className="min-w-0 flex-1 truncate text-xs font-semibold">{meName}</span>
              {meLevel != null && (
                <span className="rounded-md bg-success/15 px-1 py-0.5 text-[10px] font-bold text-success sm:px-1.5">
                  {formatLevel(meLevel)}
                </span>
              )}
              {sets.length > 0 ? (
                <div className="flex shrink-0 items-center gap-0.5">
                  {sets.map((s, i) => (
                    <span
                      key={i}
                      className={cn(
                        "flex h-5 w-5 items-center justify-center rounded text-[11px] font-bold tabular-nums sm:h-6 sm:w-6 sm:rounded-md sm:text-xs",
                        Number(s[0]) > Number(s[1])
                          ? "bg-foreground text-background"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {s[0]}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>

            {/* Rival */}
            <div className="flex items-center gap-1.5">
              <Avatar className="h-6 w-6 sm:h-7 sm:w-7">
                <AvatarImage src={m.opponent_avatar ?? undefined} />
                <AvatarFallback className="text-[10px]">{initials(opponentName)}</AvatarFallback>
              </Avatar>
              <span className="min-w-0 flex-1 truncate text-xs font-semibold">{opponentName}</span>
              {sets.length > 0 ? (
                <div className="flex shrink-0 items-center gap-0.5">
                  {sets.map((s, i) => (
                    <span
                      key={i}
                      className={cn(
                        "flex h-5 w-5 items-center justify-center rounded text-[11px] font-bold tabular-nums sm:h-6 sm:w-6 sm:rounded-md sm:text-xs",
                        Number(s[1]) > Number(s[0])
                          ? "bg-foreground text-background"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {s[1]}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          {sets.length === 0 && (
            <div className="mt-2 flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-border bg-muted/30 px-2 py-1.5 text-[10px] font-medium text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>Marcador no disponible</span>
            </div>
          )}

          {m.partner_name && (
            <p className="mt-2 truncate text-[10px] text-muted-foreground">
              Pareja: <span className="font-medium text-foreground">{m.partner_name}</span>
            </p>
          )}
        </>
      )}

      {/* Footer: resultado + delta — alineados a la misma altura */}
      <div className="mt-1.5 flex h-7 items-center justify-between border-t border-border/50 pt-1.5 sm:mt-2 sm:h-8 sm:pt-2">
        <span
          className={cn(
            "inline-flex h-5 items-center gap-1 rounded-full px-1.5 text-[10px] font-bold leading-none sm:h-6 sm:px-2 sm:text-[11px]",
            adjustment
              ? "bg-muted text-muted-foreground"
              : m.won
                ? "bg-success/15 text-success"
                : "bg-destructive/15 text-destructive",
          )}
        >
          {adjustment ? (
            <>
              <Sparkles className="h-2.5 w-2.5 shrink-0 sm:h-3 sm:w-3" strokeWidth={3} />
              <span>Ajuste</span>
            </>
          ) : (
            <>
              <Icon className="h-2.5 w-2.5 shrink-0 sm:h-3 sm:w-3" strokeWidth={3} />
              <span>{m.won ? "Ganado" : "Perdido"}</span>
            </>
          )}
        </span>
        <span
          className={cn(
            "inline-flex h-5 items-center font-display text-xs font-bold leading-none tabular-nums sm:h-6 sm:text-sm",
            getDeltaColor(Number(m.delta)),
          )}
        >
          {formatDelta(Number(m.delta))}
        </span>
      </div>
    </div>
  );
};

export const RecentMatchesCarousel = ({
  matches,
  meName,
  meAvatar,
  meLevel,
  basis = "basis-[78%] sm:basis-[55%]",
}: Props) => {
  if (matches.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-border bg-card/50 p-4 text-center text-xs text-muted-foreground">
        Aún sin partidos registrados.
      </p>
    );
  }

  return (
    <Carousel
      opts={{ align: "start", dragFree: true, containScroll: "trimSnaps" }}
      className="relative w-full md:pl-14 md:pr-14"
    >
      <CarouselContent className="-ml-2 items-stretch">
        {matches.map((m) => (
          <CarouselItem key={m.id} className={cn("pl-2", basis)}>
            <MatchCard m={m} meName={meName} meAvatar={meAvatar} meLevel={meLevel} />
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious className="hidden md:flex left-1 top-1/2 -translate-y-1/2 h-9 w-9 border-border bg-background/95 backdrop-blur shadow-md hover:bg-background z-10" />
      <CarouselNext className="hidden md:flex right-1 top-1/2 -translate-y-1/2 h-9 w-9 border-border bg-background/95 backdrop-blur shadow-md hover:bg-background z-10" />
    </Carousel>
  );
};
