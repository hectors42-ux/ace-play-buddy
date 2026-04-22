import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Check, X } from "lucide-react";
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
  const opponentName = m.opponent_name ?? "Rival";
  const Icon = m.won ? Check : X;
  const sourceLabel = SOURCE_LABEL[m.source] ?? m.source;
  const dateLabel = format(new Date(m.recorded_at), "d MMM yyyy", { locale: es });

  return (
    <div className="flex h-full flex-col rounded-2xl border border-border bg-card p-3 shadow-card">
      {/* Header: fecha y origen */}
      <div className="mb-2 flex items-center justify-between text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        <span>{dateLabel}</span>
        <span className="rounded-full bg-muted px-2 py-0.5">{sourceLabel}</span>
      </div>

      {/* Jugadores + marcador */}
      <div className="space-y-1.5">
        {/* Yo */}
        <div className="flex items-center gap-2">
          <Avatar className="h-7 w-7">
            <AvatarImage src={meAvatar ?? undefined} />
            <AvatarFallback className="text-[10px]">{initials(meName)}</AvatarFallback>
          </Avatar>
          <span className="min-w-0 flex-1 truncate text-xs font-semibold">{meName}</span>
          {meLevel != null && (
            <span className="rounded-md bg-success/15 px-1.5 py-0.5 text-[10px] font-bold text-success">
              {formatLevel(meLevel)}
            </span>
          )}
          {sets.length > 0 ? (
            <div className="flex items-center gap-1">
              {sets.map((s, i) => (
                <span
                  key={i}
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold tabular-nums",
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
        <div className="flex items-center gap-2">
          <Avatar className="h-7 w-7">
            <AvatarImage src={m.opponent_avatar ?? undefined} />
            <AvatarFallback className="text-[10px]">{initials(opponentName)}</AvatarFallback>
          </Avatar>
          <span className="min-w-0 flex-1 truncate text-xs font-semibold">{opponentName}</span>
          {sets.length > 0 ? (
            <div className="flex items-center gap-1">
              {sets.map((s, i) => (
                <span
                  key={i}
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold tabular-nums",
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
        <p className="mt-2 rounded-lg bg-muted/40 px-2 py-1 text-center text-[10px] text-muted-foreground">
          Sin marcador registrado
        </p>
      )}

      {m.partner_name && (
        <p className="mt-2 truncate text-[10px] text-muted-foreground">
          Pareja: <span className="font-medium text-foreground">{m.partner_name}</span>
        </p>
      )}

      {/* Footer: resultado + delta */}
      <div className="mt-auto flex items-center justify-between pt-3">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold",
            m.won ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive",
          )}
        >
          <Icon className="h-3 w-3" strokeWidth={3} />
          {m.won ? "Ganado" : "Perdido"}
        </span>
        <span className={cn("font-display text-sm font-bold", getDeltaColor(Number(m.delta)))}>
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
      className="w-full"
    >
      <CarouselContent className="-ml-2">
        {matches.map((m) => (
          <CarouselItem key={m.id} className={cn("pl-2", basis)}>
            <MatchCard m={m} meName={meName} meAvatar={meAvatar} meLevel={meLevel} />
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious className="hidden sm:flex -left-4" />
      <CarouselNext className="hidden sm:flex -right-4" />
    </Carousel>
  );
};
