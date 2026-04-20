import { useState } from "react";
import {
  ArrowLeft,
  Pencil,
  FileText,
  LogOut,
  Settings,
  Megaphone,
  Users,
  Trophy,
  ListOrdered,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Clock,
  Swords,
  GraduationCap,
  Download,
} from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useAuth } from "@/components/providers/AuthProvider";
import { BottomNav } from "@/components/BottomNav";
import { ThemeToggle } from "@/components/ThemeToggle";
import { PlayerRatingCard } from "@/components/rating/PlayerRatingCard";
import { RatingEvolutionChart } from "@/components/rating/RatingEvolutionChart";
import { BadgesGrid } from "@/components/profile/BadgesGrid";
import { PlayerInfoCard } from "@/components/profile/PlayerInfoCard";
import { ProfileEditDialog } from "@/components/profile/ProfileEditDialog";
import { LegalLinksList } from "@/components/legal/LegalLinksList";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useMyRatingWithCategory } from "@/hooks/useMyRatingWithCategory";
import { useMyCoachProfile } from "@/hooks/useCoaches";
import { useRatingHistory } from "@/hooks/useRatingHistory";
import { useHomeStats } from "@/hooks/useHomeStats";
import { formatDelta, formatLevel, getDeltaColor } from "@/lib/rating-utils";
import { cn } from "@/lib/utils";

const SOURCE_LABEL: Record<string, string> = {
  onboarding: "Cuestionario inicial",
  match_ladder: "Match de Ladder",
  match_tournament: "Match de Torneo",
  match_open: "Open Match",
  manual_admin: "Ajuste de admin",
  manual_self: "Ajuste manual",
  decay: "Decaimiento por inactividad",
};

const Perfil = () => {
  const { profile, user, isAdmin, signOut } = useAuth();
  const { rating, category, loading } = useMyRatingWithCategory();
  const { data: coachProfile } = useMyCoachProfile();
  const { history, loading: loadingHistory } = useRatingHistory(20);
  const { hoursThisMonth, ladderPosition, loading: loadingStats } = useHomeStats();
  const [editing, setEditing] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const memberName = profile
    ? `${profile.first_name} ${profile.last_name}`.trim()
    : "Mi perfil";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ext = (profile ?? {}) as any;

  return (
    <div className="min-h-screen bg-gradient-warm">
      <header className="sticky top-0 z-10 border-b border-border bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-md items-center gap-3 px-5 py-4">
          <Link
            to="/"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-foreground transition-smooth hover:bg-muted/70"
            aria-label="Volver al inicio"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={2.5} />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Perfil
            </p>
            <h1 className="truncate font-display text-lg font-semibold text-foreground">
              {memberName}
            </h1>
          </div>
          {profile && (
            <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
              <Pencil className="mr-1 h-3 w-3" /> Editar
            </Button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-md space-y-6 pb-28 pt-4">
        <PlayerRatingCard
          rating={rating}
          category={category}
          loading={loading}
          linkToProfile={false}
        />

        <section aria-label="Estadísticas del mes" className="px-5">
          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-2xl border border-border bg-card p-3 shadow-card">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Clock className="h-3.5 w-3.5" strokeWidth={2.4} />
                <span className="text-[10px] font-medium uppercase tracking-wider">
                  Horas este mes
                </span>
              </div>
              <p className="mt-1.5 font-display text-2xl font-semibold leading-none text-foreground">
                {loadingStats ? "…" : hoursThisMonth}
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                {hoursThisMonth > 0 ? "Reservas confirmadas" : "Sin reservas"}
              </p>
            </div>
            <Link
              to="/ladder?tab=piramide"
              className="rounded-2xl border border-border bg-card p-3 shadow-card transition-smooth hover:bg-muted"
            >
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Swords className="h-3.5 w-3.5" strokeWidth={2.4} />
                <span className="text-[10px] font-medium uppercase tracking-wider">
                  Posición pirámide
                </span>
              </div>
              <p className="mt-1.5 font-display text-2xl font-semibold leading-none text-foreground">
                {loadingStats ? "…" : ladderPosition ? `#${ladderPosition}` : "—"}
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                {ladderPosition ? "Pirámide activa" : "No estás inscrito"}
              </p>
            </Link>
          </div>
        </section>

        <section className="space-y-3 px-5">
          <h2 className="font-display text-base font-semibold">Sobre mi juego</h2>
          <PlayerInfoCard
            bio={ext.bio}
            dominantHand={ext.dominant_hand}
            backhand={ext.backhand}
            favoriteShot={ext.favorite_shot}
            favoriteSurface={ext.favorite_surface}
            playingStyle={ext.playing_style}
            availability={ext.availability}
            yearsPlaying={ext.years_playing}
            email={profile?.email}
            phone={profile?.phone}
            showEmail={ext.show_email}
            showPhone={ext.show_phone}
            isOwner
          />
        </section>

        {user && (
          <section className="space-y-3 px-5">
            <h2 className="font-display text-base font-semibold">Logros</h2>
            <BadgesGrid userId={user.id} />
          </section>
        )}

        <section className="space-y-3 px-5">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-base font-semibold">Evolución</h2>
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Últimos {history.length || 0}
            </span>
          </div>
          {loadingHistory ? (
            <div className="h-[180px] animate-pulse rounded-2xl bg-muted" />
          ) : (
            <RatingEvolutionChart history={history} />
          )}
        </section>

        <section className="space-y-3 px-5">
          <h2 className="font-display text-base font-semibold">Historial de cambios</h2>

          {history.length === 0 && !loadingHistory && (
            <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
              Aún no hay cambios registrados.
            </div>
          )}

          {history.length > 0 && (
            <>
              <ul className="space-y-2">
                {history.slice(0, 3).map((h) => {
                  const delta = Number(h.delta);
                  return (
                    <li
                      key={h.id}
                      className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 shadow-card"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium">
                          {SOURCE_LABEL[h.source] ?? h.source}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {format(new Date(h.recorded_at), "d MMM yyyy · HH:mm", { locale: es })}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-0.5">
                        <span className={cn("text-sm font-semibold", getDeltaColor(delta))}>
                          {formatDelta(delta)}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          → {formatLevel(h.level_after)}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>

              {history.length > 3 && (
                <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
                  <CollapsibleContent>
                    <ul className="mt-2 space-y-2">
                      {history.slice(3).map((h) => {
                        const delta = Number(h.delta);
                        return (
                          <li
                            key={h.id}
                            className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 shadow-card"
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-medium">
                                {SOURCE_LABEL[h.source] ?? h.source}
                              </p>
                              <p className="text-[11px] text-muted-foreground">
                                {format(new Date(h.recorded_at), "d MMM yyyy · HH:mm", { locale: es })}
                              </p>
                            </div>
                            <div className="flex flex-col items-end gap-0.5">
                              <span className={cn("text-sm font-semibold", getDeltaColor(delta))}>
                                {formatDelta(delta)}
                              </span>
                              <span className="text-[11px] text-muted-foreground">
                                → {formatLevel(h.level_after)}
                              </span>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </CollapsibleContent>
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      className="mt-2 flex w-full items-center justify-center gap-1 rounded-2xl border border-dashed border-border bg-card/50 px-4 py-2 text-xs font-medium text-muted-foreground transition-smooth hover:bg-card"
                    >
                      {historyOpen ? (
                        <>
                          <ChevronUp className="h-3.5 w-3.5" /> Ocultar
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-3.5 w-3.5" /> Ver {history.length - 3} más
                        </>
                      )}
                    </button>
                  </CollapsibleTrigger>
                </Collapsible>
              )}
            </>
          )}
        </section>

        <section className="space-y-3 px-5">
          <h2 className="flex items-center gap-2 font-display text-base font-semibold">
            <Settings className="h-4 w-4" /> Preferencias
          </h2>
          <div className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 shadow-card">
            <div>
              <p className="text-sm font-medium text-foreground">Tema de la app</p>
              <p className="text-[11px] text-muted-foreground">Claro u oscuro</p>
            </div>
            <ThemeToggle />
          </div>
        </section>

        {coachProfile && (
          <section className="space-y-3 px-5">
            <h2 className="flex items-center gap-2 font-display text-base font-semibold">
              <GraduationCap className="h-4 w-4" /> Soy coach
            </h2>
            <Link
              to="/coach"
              className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground shadow-card transition-smooth hover:bg-muted"
            >
              <span className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-primary" />
                Mi panel de coach
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          </section>
        )}

        {isAdmin && (
          <section className="space-y-3 px-5">
            <h2 className="flex items-center gap-2 font-display text-base font-semibold">
              <Settings className="h-4 w-4" /> Administración del club
            </h2>
            <div className="space-y-2">
              {[
                { to: "/admin/canchas", icon: Settings, label: "Canchas y reglas" },
                { to: "/admin/socios", icon: Users, label: "Administrar socios" },
                { to: "/admin/torneos", icon: Trophy, label: "Administrar torneos" },
                { to: "/admin/ladder", icon: ListOrdered, label: "Administrar ladder" },
                { to: "/admin/clases", icon: GraduationCap, label: "Clases & coaches" },
                { to: "/admin/comunicaciones", icon: Megaphone, label: "Anuncios del club" },
                { to: "/admin/documentos", icon: FileText, label: "Reglamentos y documentos" },
              ].map(({ to, icon: Icon, label }) => (
                <Link
                  key={to}
                  to={to}
                  className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground shadow-card transition-smooth hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-primary" />
                    {label}
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="space-y-3 px-5">
          <h2 className="flex items-center gap-2 font-display text-base font-semibold">
            <FileText className="h-4 w-4" /> Documentos y ayuda
          </h2>
          <LegalLinksList />
          <Link
            to="/install"
            className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground shadow-card transition-smooth hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="flex items-center gap-2">
              <Download className="h-4 w-4 text-primary" />
              Instalar app en tu teléfono
            </span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        </section>

        <section className="px-5">
          <Button
            variant="outline"
            className="w-full justify-center gap-2"
            onClick={() => signOut()}
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </Button>
        </section>

        <footer className="space-y-1 px-5 pt-2 text-center">
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Powered by AcePlay · 2026
          </p>
          <p className="text-[10px] text-muted-foreground/80">
            Todos los derechos reservados.
          </p>
        </footer>
      </main>

      {profile && (
        <ProfileEditDialog
          open={editing}
          onOpenChange={setEditing}
          profile={profile as never}
          onSaved={() => undefined}
        />
      )}

      <BottomNav />
    </div>
  );
};

export default Perfil;
