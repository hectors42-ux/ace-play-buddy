import { useState } from "react";
import { Link } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Trophy,
  Swords,
  Crown,
  Phone,
  Mail,
  ExternalLink,
  Hand,
  Activity,
  MapPin,
  Calendar as CalendarIcon,
  Award,
  Flame,
  ListOrdered,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useUserProfileSummary } from "@/hooks/useUserProfileSummary";
import { MiniSparkline } from "./MiniSparkline";
import { AvatarViewer } from "./AvatarViewer";
import { formatLevel, formatDelta, getDeltaColor, type RatingSport } from "@/lib/rating-utils";
import { cn } from "@/lib/utils";

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

const Chip = ({ icon: Icon, label }: { icon: typeof Hand; label: string }) => (
  <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-[11px] font-medium text-foreground">
    <Icon className="h-3 w-3 text-muted-foreground" strokeWidth={2.2} />
    {label}
  </span>
);

const Stat = ({ label, value, hint }: { label: string; value: string | number; hint?: string }) => (
  <div className="rounded-2xl border border-border bg-card p-2.5 text-center">
    <p className="font-display text-base font-bold leading-none">{value}</p>
    <p className="mt-1 text-[9px] uppercase tracking-wider text-muted-foreground">{label}</p>
    {hint && <p className="mt-0.5 text-[9px] text-muted-foreground">{hint}</p>}
  </div>
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

  if (loading && !data) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-32 w-full rounded-3xl" />
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-16 w-full rounded-2xl" />
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

  const { profile, rating, positions, stats, recent_matches, recent_badges, sparkline, flags } = data;
  const total = stats.wins + stats.losses;
  const winRate = total > 0 ? Math.round((stats.wins / total) * 100) : 0;
  const delta = Number(rating?.last_change_delta ?? 0);
  const DeltaIcon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
  const cat = rating?.category ?? null;
  const streakLabel =
    stats.streak > 0 && stats.streak_kind
      ? stats.streak_kind === "desafio_ganado"
        ? `🔥 ${stats.streak}V`
        : `❄️ ${stats.streak}D`
      : "—";
  const fullName = `${profile.first_name} ${profile.last_name}`.trim();
  const memberYear = profile.member_since ? new Date(profile.member_since).getFullYear() : null;

  const hasGameInfo =
    profile.dominant_hand ||
    profile.backhand ||
    profile.favorite_shot ||
    profile.favorite_surface ||
    profile.playing_style ||
    profile.years_playing;

  return (
    <div className="space-y-3">
      {/* Header: avatar + name + category */}
      <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-elevated">
        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-4">
          <div className="flex items-start gap-3">
            <Avatar className="h-16 w-16 ring-2 ring-background">
              <AvatarImage src={profile.avatar_url ?? undefined} />
              <AvatarFallback className="text-base font-semibold">
                {initials(profile.first_name, profile.last_name)}
              </AvatarFallback>
            </Avatar>
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
                  “{profile.bio}”
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

        {/* Top stats */}
        <div className="grid grid-cols-3 gap-2 border-t border-border p-3">
          <div className="rounded-2xl bg-muted/40 p-2.5 text-center">
            <p className="font-display text-xl font-bold leading-none">
              {rating ? formatLevel(rating.level) : "—"}
            </p>
            <p className="mt-1 text-[9px] uppercase tracking-wider text-muted-foreground">Nivel</p>
            {delta !== 0 && (
              <p className={cn("mt-0.5 inline-flex items-center justify-center gap-0.5 text-[10px] font-medium", getDeltaColor(delta))}>
                <DeltaIcon className="h-2.5 w-2.5" strokeWidth={2.5} />
                {formatDelta(delta)}
              </p>
            )}
          </div>
          <div className="rounded-2xl bg-muted/40 p-2.5 text-center">
            <p className="font-display text-xl font-bold leading-none">
              {positions.ranking ? `#${positions.ranking}` : "—"}
            </p>
            <p className="mt-1 text-[9px] uppercase tracking-wider text-muted-foreground">Ranking</p>
            <p className="mt-0.5 text-[9px] text-muted-foreground">
              {rating && rating.reliability < 30 ? "calibrando" : "consolidado"}
            </p>
          </div>
          <div className="rounded-2xl bg-muted/40 p-2.5 text-center">
            <p className="font-display text-xl font-bold leading-none">
              {positions.ladder ? `#${positions.ladder}` : "—"}
            </p>
            <p className="mt-1 text-[9px] uppercase tracking-wider text-muted-foreground">Pirámide</p>
            <p className="mt-0.5 text-[9px] text-muted-foreground">
              {positions.ladder_status ?? "no inscrito"}
            </p>
          </div>
        </div>
      </div>

      {/* 4 stats grid */}
      <div className="grid grid-cols-4 gap-2">
        <Stat label="Partidos" value={rating?.matches_played ?? 0} />
        <Stat label="% Win" value={total > 0 ? `${winRate}%` : "—"} />
        <Stat label="Racha" value={streakLabel} />
        <Stat label="Mejor" value={rating ? formatLevel(rating.best_level) : "—"} hint="histórico" />
      </div>

      {/* Sparkline */}
      <div className="rounded-2xl border border-border bg-card p-3">
        <div className="mb-1.5 flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Evolución (últimos {sparkline.length || 0})
          </p>
          {flags.is_owner && (
            <Link to="/ranking?tab=evolucion" className="inline-flex items-center gap-0.5 text-[10px] text-primary">
              Ver completa <ExternalLink className="h-2.5 w-2.5" />
            </Link>
          )}
        </div>
        <MiniSparkline values={sparkline} />
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
        {recent_matches.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-card/50 p-4 text-center text-xs text-muted-foreground">
            Aún sin partidos registrados.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {recent_matches.slice(0, 3).map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2 text-xs"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold",
                      m.won ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive",
                    )}
                  >
                    {m.won ? "✓" : "✗"}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {m.opponent_name ? `vs ${m.opponent_name}` : "Cambio de nivel"}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {format(parseISO(m.recorded_at), "d MMM yyyy", { locale: es })}
                    </p>
                  </div>
                </div>
                <span className={cn("font-display text-xs font-semibold", getDeltaColor(Number(m.delta)))}>
                  {formatDelta(Number(m.delta))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Badges removidos: ahora solo se muestran en /perfil mediante BadgesGrid (desbloqueados + por desbloquear) */}

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
    </div>
  );
};
