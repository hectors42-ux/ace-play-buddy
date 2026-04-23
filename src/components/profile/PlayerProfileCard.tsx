import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Swords,
  Phone,
  Mail,
  ArrowRight,
  Hand,
  Activity,
  MapPin,
  Calendar as CalendarIcon,
  Flame,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useUserProfileSummary } from "@/hooks/useUserProfileSummary";
import { useClubRanking, type RankingSport } from "@/hooks/useClubRanking";
import { RecentMatchesCarousel } from "@/components/ranking/RecentMatchesCarousel";
import { AvatarViewer } from "./AvatarViewer";
import { StatRing } from "./StatRing";
import { Last10StreakRing } from "./Last10StreakRing";
import { formatLevel, type RatingSport } from "@/lib/rating-utils";
import { cn, formatStreakLabel, formatStreakLabelShort } from "@/lib/utils";

interface Props {
  userId: string;
  mode: "own" | "public";
  sport?: RatingSport;
  onChallenge?: () => void;
  showChallengeButton?: boolean;
}

const initials = (first: string, last: string) =>
  `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase() || "?";

const HAND_LABEL: Record<string, string> = { right: "Diestro", left: "Zurdo", ambi: "Ambidiestro" };
const BACKHAND_LABEL: Record<string, string> = { one_handed: "Revés a 1 mano", two_handed: "Revés a 2 manos" };
const SURFACE_LABEL: Record<string, string> = {
  arcilla: "Arcilla",
  cesped: "Césped",
  dura: "Dura",
  sintetico: "Sintética",
};

const CAT_STYLE: Record<string, string> = {
  A: "bg-success/15 text-success",
  B: "bg-primary/15 text-primary",
  C: "bg-accent/20 text-accent-foreground",
};

/** Fuentes que NO son partidos contra otro socio (mismo set que en RecentMatchesCarousel). */
const NON_VERSUS_SOURCES = new Set([
  "clase",
  "onboarding",
  "manual_admin",
  "manual_self",
  "decay",
]);

const Chip = ({ icon: Icon, label }: { icon: typeof Hand; label: string }) => (
  <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-[11px] font-medium text-foreground">
    <Icon className="h-3 w-3 text-muted-foreground" strokeWidth={2.2} />
    {label}
  </span>
);

export const PlayerProfileCard = ({
  userId,
  mode,
  sport: initialSport = "tenis_singles",
  onChallenge,
  showChallengeButton,
}: Props) => {
  const [sport, setSport] = useState<RatingSport>(initialSport);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const { data, loading } = useUserProfileSummary(userId, sport);
  const { rows: ranking } = useClubRanking(sport as RankingSport);
  const myRanking = useMemo(
    () => ranking.find((r) => r.user_id === userId) ?? null,
    [ranking, userId],
  );

  // Hooks must run before any early return
  // Últimos 10 resultados con contrincante real (mismo criterio que RecentMatchesCarousel:
  // descarta fuentes sin oponente Y entradas sin opponent_name aunque la fuente sea versus).
  const last10Results = useMemo<boolean[]>(() => {
    if (!data) return [];
    const versus = data.recent_matches.filter(
      (m) => !NON_VERSUS_SOURCES.has(m.source) && !!m.opponent_name,
    );
    // recent_matches viene del más reciente al más antiguo. Tomamos los 10 más recientes
    // y los invertimos para mostrarlos del más antiguo al más reciente en el anillo.
    return versus.slice(0, 10).reverse().map((m) => m.won);
  }, [data]);

  if (loading && !data) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-32 w-full rounded-3xl" />
        <Skeleton className="h-28 w-full rounded-3xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card/50 p-6 text-center text-xs text-muted-foreground">
        No se pudo cargar el perfil.
      </div>
    );
  }

  const { profile, rating, stats, recent_matches, flags } = data;
  const total = stats.wins + stats.losses;
  const winRate = total > 0 ? Math.round((stats.wins / total) * 100) : 0;
  const cat = rating?.category ?? null;
  const fullName = `${profile.first_name} ${profile.last_name}`.trim();
  const memberYear = profile.member_since ? new Date(profile.member_since).getFullYear() : null;

  // streak con signo: positivo = victorias, negativo = derrotas
  const signedStreak =
    stats.streak_kind === "desafio_ganado"
      ? stats.streak
      : stats.streak_kind === "desafio_perdido"
        ? -stats.streak
        : 0;

  const hasGameInfo =
    profile.dominant_hand ||
    profile.backhand ||
    profile.favorite_shot ||
    profile.favorite_surface ||
    profile.playing_style ||
    profile.years_playing;

  return (
    <div className="space-y-3">
      {/* Header: avatar + nombre */}
      <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-elevated">
        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-4">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() => setAvatarOpen(true)}
              className="rounded-full transition-smooth hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={`Ver foto de ${fullName}`}
            >
              <Avatar className="h-16 w-16 ring-2 ring-background">
                <AvatarImage src={profile.avatar_url ?? undefined} />
                <AvatarFallback className="text-base font-semibold">
                  {initials(profile.first_name, profile.last_name)}
                </AvatarFallback>
              </Avatar>
            </button>
            <div className="min-w-0 flex-1">
              <h3 className="truncate font-display text-lg font-semibold leading-tight">
                {fullName}
                {flags.is_owner && (
                  <span className="ml-2 align-middle text-[9px] font-bold uppercase tracking-wider text-primary">
                    Tú
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-muted-foreground">
                {memberYear ? `Socio desde ${memberYear}` : "Socio del club"}
              </p>
              {profile.bio && (
                <p className="mt-1.5 line-clamp-2 text-[12px] italic text-muted-foreground">
                  "{profile.bio}"
                </p>
              )}
            </div>
            {cat && (
              <div className={cn("flex flex-col items-center rounded-2xl px-2.5 py-1.5", CAT_STYLE[cat])}>
                <span className="font-display text-lg font-bold leading-none">{cat}</span>
                <span className="text-[8px] font-semibold uppercase tracking-wider opacity-80">Cat.</span>
              </div>
            )}
          </div>
        </div>

        {/* Sport toggle */}
        <div className="flex gap-1 border-t border-border p-1">
          {(["tenis_singles", "tenis_dobles"] as RatingSport[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSport(s)}
              className={cn(
                "flex-1 rounded-xl px-3 py-1.5 text-[11px] font-medium transition-smooth",
                sport === s
                  ? "bg-primary text-primary-foreground shadow-clay"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {s === "tenis_singles" ? "Singles" : "Dobles"}
            </button>
          ))}
        </div>
      </div>

      {/* Hero "Tu nivel actual" — mismo estilo y estructura que MyEvolutionTab */}
      <div className="rounded-3xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-4">
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Tu nivel actual
            </p>
            <p className="font-display text-3xl font-bold leading-none">
              {rating ? formatLevel(rating.level) : "—"}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Categoría {cat ?? "—"}
            </p>
          </div>
          {signedStreak !== 0 && (
            <span
              className={cn(
                "inline-flex shrink-0 items-center gap-1 self-start whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold",
                signedStreak > 0
                  ? "bg-success/15 text-success"
                  : "bg-destructive/15 text-destructive",
              )}
              title={formatStreakLabel(signedStreak)}
            >
              {signedStreak > 0 && <Flame className="h-3 w-3" />}
              <span className="sm:hidden">{formatStreakLabelShort(signedStreak)}</span>
              <span className="hidden sm:inline">{formatStreakLabel(signedStreak)}</span>
            </span>
          )}
        </div>

        {/* Posiciones: ranking + pirámide */}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-2xl border border-border/60 bg-background/40 p-3">
            <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
              Ranking
            </p>
            <p className="mt-1 font-display text-xl font-bold leading-none">
              {myRanking ? `#${myRanking.rank_position}` : "—"}
            </p>
            <p className="mt-1 text-[10px] text-muted-foreground">
              {sport === "tenis_singles" ? "Singles" : "Dobles"} del club
            </p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-background/40 p-3">
            <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
              Pirámide
            </p>
            <p className="mt-1 font-display text-xl font-bold leading-none">
              {data.positions.ladder ? `#${data.positions.ladder}` : "—"}
            </p>
            <p className="mt-1 text-[10px] text-muted-foreground">
              {data.positions.ladder_status ?? "no inscrito"}
            </p>
          </div>
        </div>

        {flags.is_owner && (
          <Button asChild variant="ghost" size="sm" className="mt-3 h-8 w-full justify-between text-[11px]">
            <Link to="/ranking?tab=evolucion">
              Ver evolución completa
              <ArrowRight className="h-3 w-3" />
            </Link>
          </Button>
        )}
      </div>

      {/* Estadísticas con anillos */}
      <div className="rounded-3xl border border-border bg-card p-4">
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Estadísticas
        </p>
        <div className="grid grid-cols-3 gap-2">
          {/* % Ganados */}
          <div className="flex flex-col items-center gap-1.5 text-center">
            <StatRing
              percent={total > 0 ? winRate : 0}
              centerLabel={total > 0 ? `${winRate}%` : "—"}
              tone="success"
            />
            <p className="text-[10px] font-semibold uppercase tracking-wide text-foreground">
              Ganados
            </p>
            <p className="text-[10px] tabular-nums text-muted-foreground">
              {stats.wins}V · {stats.losses}D
            </p>
          </div>

          {/* Partidos jugados */}
          <div className="flex flex-col items-center gap-1.5 text-center">
            <StatRing
              percent={Math.min(100, ((rating?.matches_played ?? 0) / 30) * 100)}
              centerLabel={String(rating?.matches_played ?? 0)}
              tone="primary"
            />
            <p className="text-[10px] font-semibold uppercase tracking-wide text-foreground">
              Partidos
            </p>
            <p className="text-[10px] text-muted-foreground">jugados</p>
          </div>

          {/* Racha últimos 10 */}
          <div className="flex flex-col items-center gap-1.5 text-center">
            <Last10StreakRing results={last10Results} />
            <p className="text-[10px] font-semibold uppercase tracking-wide text-foreground">
              Últimos 10
            </p>
            <p className="text-[10px] tabular-nums text-muted-foreground">
              {last10Results.length === 0
                ? "sin partidos"
                : `${last10Results.filter(Boolean).length}V · ${last10Results.filter((r) => !r).length}D`}
            </p>
          </div>
        </div>
      </div>

      {/* Game style chips */}
      {hasGameInfo && (
        <div>
          <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Sobre su juego
          </p>
          <div className="flex flex-wrap gap-1.5">
            {profile.dominant_hand && <Chip icon={Hand} label={HAND_LABEL[profile.dominant_hand]} />}
            {profile.backhand && <Chip icon={Hand} label={BACKHAND_LABEL[profile.backhand]} />}
            {profile.favorite_shot && <Chip icon={Activity} label={profile.favorite_shot} />}
            {profile.favorite_surface && (
              <Chip icon={MapPin} label={SURFACE_LABEL[profile.favorite_surface] ?? profile.favorite_surface} />
            )}
            {profile.playing_style && <Chip icon={Activity} label={profile.playing_style} />}
            {profile.years_playing !== null && profile.years_playing !== undefined && (
              <Chip icon={CalendarIcon} label={`${profile.years_playing} años`} />
            )}
            {profile.availability && <Chip icon={CalendarIcon} label={profile.availability} />}
          </div>
        </div>
      )}

      {/* Recent matches */}
      <div>
        <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Últimos partidos
        </p>
        <RecentMatchesCarousel
          matches={recent_matches.slice(0, 8)}
          meName={fullName}
          meAvatar={profile.avatar_url}
          meLevel={rating?.level ?? null}
          basis="basis-[72%] sm:basis-[48%]"
        />
      </div>

      {/* Contact (only public mode + opt-in) */}
      {mode === "public" && !flags.is_owner && (profile.email || profile.phone) && (
        <div className="rounded-2xl border border-border bg-card p-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Contacto
          </p>
          <div className="flex flex-wrap gap-2">
            {profile.phone && (
              <a
                href={`https://wa.me/${profile.phone.replace(/\D/g, "")}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-muted"
              >
                <Phone className="h-3 w-3" /> WhatsApp
              </a>
            )}
            {profile.email && (
              <a
                href={`mailto:${profile.email}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-muted"
              >
                <Mail className="h-3 w-3" /> Email
              </a>
            )}
          </div>
        </div>
      )}

      {/* Challenge action */}
      {mode === "public" && showChallengeButton && onChallenge && !flags.is_owner && (
        <Button variant="clay" className="w-full" onClick={onChallenge}>
          <Swords className="h-4 w-4" /> Desafiar en pirámide
        </Button>
      )}

      <AvatarViewer
        open={avatarOpen}
        onOpenChange={setAvatarOpen}
        url={profile.avatar_url}
        name={fullName}
        initials={initials(profile.first_name, profile.last_name)}
      />
    </div>
  );
};
