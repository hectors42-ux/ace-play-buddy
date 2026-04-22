import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, Layers, Trophy, Users, CalendarClock } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCategoryBundle } from "@/hooks/useCategoryData";
import { BracketView } from "@/components/tournaments/BracketView";
import { MatchList } from "@/components/tournaments/MatchList";
import { RegistrationList } from "@/components/tournaments/RegistrationList";
import { ResultDialog } from "@/components/tournaments/ResultDialog";
import { ScheduleDialog } from "@/components/tournaments/ScheduleDialog";
import { SeedingDialog } from "@/components/tournaments/SeedingDialog";
import {
  DISCIPLINE_LABEL,
  GENDER_LABEL,
  TOURNAMENT_STATUS_LABEL,
  tournamentStatusColor,
} from "@/lib/tournament-utils";
import type { Match } from "@/hooks/useCategoryData";

const AdminCategoryDetail = () => {
  const { id: tournamentId, catId } = useParams<{ id: string; catId: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const {
    tournament,
    category,
    registrations,
    matches,
    players,
    pendingResults,
    pendingReschedules,
    courts,
    loading,
    reload,
  } = useCategoryBundle(catId);

  const [seedingOpen, setSeedingOpen] = useState(false);
  const [scheduleMatch, setScheduleMatch] = useState<Match | null>(null);
  const [resultMatch, setResultMatch] = useState<Match | null>(null);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-warm">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!tournament || !category) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-gradient-warm">
        <p className="text-sm text-muted-foreground">Categoría no encontrada</p>
        <Link to={`/admin/torneos/${tournamentId}`} className="text-sm text-primary underline">
          Volver
        </Link>
      </div>
    );
  }

  const confirmedCount = registrations.filter((r) => r.status === "confirmada").length;
  const bracketGenerated = !!category.bracket_generated_at;

  return (
    <div className="min-h-screen bg-gradient-warm pb-12">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-5 py-4">
          <Link
            to={`/admin/torneos/${tournamentId}`}
            className="flex h-9 w-9 items-center justify-center rounded-2xl border border-border bg-card text-muted-foreground hover:text-foreground"
            aria-label="Volver"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-muted-foreground">{tournament.name}</p>
            <h1 className="truncate font-display text-lg font-semibold">{category.name}</h1>
          </div>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${tournamentStatusColor(category.status)}`}
          >
            {TOURNAMENT_STATUS_LABEL[category.status]}
          </span>
        </div>
        <div className="mx-auto flex max-w-3xl gap-3 px-5 pb-3 text-xs text-muted-foreground">
          <span>{DISCIPLINE_LABEL[category.discipline]}</span>
          <span>·</span>
          <span>{GENDER_LABEL[category.gender]}</span>
          <span>·</span>
          <span>cupo {category.max_participants}</span>
          <span>·</span>
          <span>{confirmedCount} confirmados</span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 pt-4">
        <Tabs defaultValue="registrations">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="registrations" className="text-xs">
              <Users className="mr-1 h-3 w-3" /> Inscritos
            </TabsTrigger>
            <TabsTrigger value="bracket" className="text-xs">
              <Trophy className="mr-1 h-3 w-3" /> Llave
            </TabsTrigger>
            <TabsTrigger value="schedule" className="text-xs">
              <CalendarClock className="mr-1 h-3 w-3" /> Programar
            </TabsTrigger>
            <TabsTrigger value="results" className="text-xs">
              <Layers className="mr-1 h-3 w-3" /> Partidos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="registrations" className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Total: {registrations.length} · Confirmados: {confirmedCount}
              </p>
            </div>
            <RegistrationList
              registrations={registrations}
              players={players}
              bracketGenerated={bracketGenerated}
              isAdmin
              onChanged={reload}
            />
          </TabsContent>

          <TabsContent value="bracket" className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {bracketGenerated
                  ? `Llave generada (${matches.length} partidos)`
                  : `Llave pendiente · ${confirmedCount} inscripciones confirmadas`}
              </p>
              {!bracketGenerated && (
                <Button size="sm" onClick={() => setSeedingOpen(true)} disabled={confirmedCount < 2}>
                  Generar llave
                </Button>
              )}
            </div>
            <BracketView
              matches={matches}
              registrations={registrations}
              players={players}
              courts={courts}
              onMatchClick={(m) => navigate(`?match=${m.id}`)}
            />
          </TabsContent>

          <TabsContent value="schedule" className="mt-4 space-y-3">
            <p className="text-xs text-muted-foreground">
              Asigna cancha y horario. Se crea una reserva automática que bloquea la cancha.
            </p>
            <MatchList
              matches={matches.filter(
                (m) =>
                  m.registration_a_id &&
                  m.registration_b_id &&
                  m.status !== "jugado" &&
                  m.status !== "walkover" &&
                  m.status !== "cancelado",
              )}
              registrations={registrations}
              players={players}
              courts={courts}
              pendingResults={pendingResults}
              pendingReschedules={pendingReschedules}
              isAdmin
              rescheduleEnabled={tournament.reschedule_enabled}
              onSchedule={setScheduleMatch}
              onResult={setResultMatch}
              onReschedule={setScheduleMatch}
              onChanged={reload}
              emptyText="No hay partidos listos para programar."
            />
          </TabsContent>

          <TabsContent value="results" className="mt-4 space-y-3">
            <MatchList
              matches={matches}
              registrations={registrations}
              players={players}
              courts={courts}
              pendingResults={pendingResults}
              pendingReschedules={pendingReschedules}
              isAdmin
              rescheduleEnabled={tournament.reschedule_enabled}
              onSchedule={setScheduleMatch}
              onResult={setResultMatch}
              onReschedule={setScheduleMatch}
              onChanged={reload}
              emptyText="Aún no hay partidos. Genera la llave primero."
            />
          </TabsContent>
        </Tabs>
      </main>

      <SeedingDialog
        open={seedingOpen}
        onOpenChange={setSeedingOpen}
        categoryId={category.id}
        registrations={registrations}
        players={players}
        onGenerated={reload}
      />
      <ScheduleDialog
        open={!!scheduleMatch}
        onOpenChange={(v) => !v && setScheduleMatch(null)}
        match={scheduleMatch}
        courts={courts}
        onScheduled={reload}
        mode={isAdmin ? "schedule" : "schedule"}
      />
      <ResultDialog
        open={!!resultMatch}
        onOpenChange={(v) => !v && setResultMatch(null)}
        match={resultMatch}
        registrations={registrations}
        players={players}
        onSubmitted={reload}
      />
    </div>
  );
};

export default AdminCategoryDetail;
