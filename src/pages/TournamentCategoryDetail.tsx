import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, BarChart3, Layers, Loader2, Trophy, Users } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCategoryBundle } from "@/hooks/useCategoryData";
import { BracketView } from "@/components/tournaments/BracketView";
import { MatchList } from "@/components/tournaments/MatchList";
import { RegistrationList } from "@/components/tournaments/RegistrationList";
import { RegisterDialog } from "@/components/tournaments/RegisterDialog";
import { ResultDialog } from "@/components/tournaments/ResultDialog";
import { RescheduleDialog } from "@/components/tournaments/RescheduleDialog";
import { TournamentStats } from "@/components/tournaments/TournamentStats";
import { LiveIndicator } from "@/components/tournaments/LiveIndicator";
import {
  DISCIPLINE_LABEL,
  GENDER_LABEL,
  TOURNAMENT_STATUS_LABEL,
  tournamentStatusColor,
} from "@/lib/tournament-utils";
import type { Match } from "@/hooks/useCategoryData";

const TournamentCategoryDetail = () => {
  const { slug, catId } = useParams<{ slug: string; catId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
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
    lastUpdatedAt,
    refreshing,
    isLive,
  } = useCategoryBundle(catId);

  const [registerOpen, setRegisterOpen] = useState(false);
  const [resultMatch, setResultMatch] = useState<Match | null>(null);
  const [rescheduleMatch, setRescheduleMatch] = useState<Match | null>(null);

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
        <Link to={`/torneos/${slug}`} className="text-sm text-primary underline">
          Volver
        </Link>
      </div>
    );
  }

  const myReg = registrations.find(
    (r) =>
      (r.player1_user_id === user?.id || r.player2_user_id === user?.id) &&
      r.status !== "rechazada" &&
      r.status !== "retirada",
  );
  const myMatches = matches.filter((m) => {
    if (!user) return false;
    const inA = m.registration_a_id
      ? registrations.find((r) => r.id === m.registration_a_id)
      : undefined;
    const inB = m.registration_b_id
      ? registrations.find((r) => r.id === m.registration_b_id)
      : undefined;
    return [
      inA?.player1_user_id,
      inA?.player2_user_id,
      inB?.player1_user_id,
      inB?.player2_user_id,
    ].includes(user.id);
  });
  const canRegister =
    !myReg && tournament.status === "inscripciones_abiertas" && category.status !== "finalizado";

  return (
    <div className="min-h-screen bg-gradient-warm pb-28">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-md items-center gap-3 px-5 py-4">
          <button
            type="button"
            onClick={() => navigate(`/torneos/${slug}`)}
            className="flex h-9 w-9 items-center justify-center rounded-2xl border border-border bg-card text-muted-foreground hover:text-foreground"
            aria-label="Volver"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
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
        <div className="mx-auto flex max-w-md flex-wrap items-center gap-2 px-5 pb-3 text-xs text-muted-foreground">
          <span>{DISCIPLINE_LABEL[category.discipline]}</span>
          <span>·</span>
          <span>{GENDER_LABEL[category.gender]}</span>
          <span>·</span>
          <span>cupo {category.max_participants}</span>
          {isLive && (
            <LiveIndicator
              lastUpdatedAt={lastUpdatedAt}
              refreshing={refreshing}
              className="ml-auto"
            />
          )}
        </div>
      </header>

      <main className="mx-auto max-w-md space-y-4 px-5 pt-4">
        {canRegister && (
          <Button className="w-full" onClick={() => setRegisterOpen(true)}>
            Inscribirme
          </Button>
        )}
        {myReg && (
          <div className="rounded-2xl border border-primary/30 bg-primary/5 p-3 text-sm">
            <p className="font-medium">Estás inscrito</p>
            <p className="text-xs text-muted-foreground">
              Estado: {TOURNAMENT_STATUS_LABEL[category.status as never] ?? myReg.status}
            </p>
          </div>
        )}

        <Tabs defaultValue={category.status === "finalizado" ? "stats" : myMatches.length > 0 ? "mine" : "bracket"}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="mine" className="text-[10px]">
              <Trophy className="mr-1 h-3 w-3" /> Míos
            </TabsTrigger>
            <TabsTrigger value="bracket" className="text-[10px]">
              <Layers className="mr-1 h-3 w-3" /> Llave
            </TabsTrigger>
            <TabsTrigger value="players" className="text-[10px]">
              <Users className="mr-1 h-3 w-3" /> Inscritos
            </TabsTrigger>
            <TabsTrigger value="stats" className="text-[10px]">
              <BarChart3 className="mr-1 h-3 w-3" /> Stats
            </TabsTrigger>
          </TabsList>

          <TabsContent value="mine" className="mt-4">
            <MatchList
              matches={myMatches}
              registrations={registrations}
              players={players}
              courts={courts}
              pendingResults={pendingResults}
              pendingReschedules={pendingReschedules}
              isAdmin={false}
              rescheduleEnabled={tournament.reschedule_enabled}
              onSchedule={() => {}}
              onResult={setResultMatch}
              onReschedule={setRescheduleMatch}
              onChanged={reload}
              emptyText={myReg ? "Aún no tienes partidos asignados." : "Inscríbete para ver tus partidos."}
            />
          </TabsContent>

          <TabsContent value="bracket" className="mt-4">
            <BracketView
              matches={matches}
              registrations={registrations}
              players={players}
              highlightUserId={user?.id}
            />
          </TabsContent>

          <TabsContent value="players" className="mt-4">
            <RegistrationList
              registrations={registrations}
              players={players}
              bracketGenerated={!!category.bracket_generated_at}
              isAdmin={false}
              onChanged={reload}
            />
          </TabsContent>

          <TabsContent value="stats" className="mt-4">
            <TournamentStats
              category={category}
              matches={matches}
              registrations={registrations}
              players={players}
            />
          </TabsContent>
        </Tabs>
      </main>

      <RegisterDialog
        open={registerOpen}
        onOpenChange={setRegisterOpen}
        category={category}
        onRegistered={reload}
      />
      <ResultDialog
        open={!!resultMatch}
        onOpenChange={(v) => !v && setResultMatch(null)}
        match={resultMatch}
        registrations={registrations}
        players={players}
        onSubmitted={reload}
      />
      <RescheduleDialog
        open={!!rescheduleMatch}
        onOpenChange={(v) => !v && setRescheduleMatch(null)}
        match={rescheduleMatch}
        courts={courts}
        windowHours={tournament.reschedule_window_hours}
        minNoticeHours={tournament.reschedule_min_notice_hours}
        onRequested={reload}
      />

      <BottomNav />
    </div>
  );
};

export default TournamentCategoryDetail;
