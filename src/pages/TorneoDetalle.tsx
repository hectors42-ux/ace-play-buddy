import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Calendar, Loader2, Trophy, UserPlus, Users, X } from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/providers/AuthProvider";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import {
  DISCIPLINE_LABEL,
  REGISTRATION_STATUS_LABEL,
  SURFACE_LABEL,
  TOURNAMENT_STATUS_LABEL,
  formatScore,
  registrationStatusColor,
  roundLabel,
  tournamentStatusColor,
  type RegistrationStatus,
  type TournamentStatus,
} from "@/lib/tournament-utils";
import type { Tables } from "@/integrations/supabase/types";

type Tournament = Tables<"tournaments">;
type Registration = Tables<"tournament_registrations">;
type Match = Tables<"tournament_matches">;
type Profile = Pick<Tables<"profiles">, "user_id" | "first_name" | "last_name">;

const TorneoDetalle = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [profileMap, setProfileMap] = useState<Map<string, Profile>>(new Map());
  const [loading, setLoading] = useState(true);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [partners, setPartners] = useState<Profile[]>([]);
  const [partnerId, setPartnerId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const loadAll = async () => {
    if (!slug) return;
    const { data: t } = await supabase.from("tournaments").select("*").eq("slug", slug).maybeSingle();
    if (!t) {
      setLoading(false);
      return;
    }
    setTournament(t);
    const [{ data: regs }, { data: mts }] = await Promise.all([
      supabase
        .from("tournament_registrations")
        .select("*")
        .eq("tournament_id", t.id)
        .order("registered_at"),
      supabase
        .from("tournament_matches")
        .select("*")
        .eq("tournament_id", t.id)
        .order("round", { ascending: false })
        .order("bracket_position"),
    ]);
    setRegistrations(regs ?? []);
    setMatches(mts ?? []);

    const ids = new Set<string>();
    (regs ?? []).forEach((r) => {
      ids.add(r.player1_user_id);
      if (r.player2_user_id) ids.add(r.player2_user_id);
    });
    if (ids.size) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, first_name, last_name")
        .in("user_id", Array.from(ids));
      const map = new Map<string, Profile>();
      (profs ?? []).forEach((p) => map.set(p.user_id, p));
      setProfileMap(map);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  // Cargar lista de socios para selector de pareja (dobles)
  useEffect(() => {
    const loadPartners = async () => {
      if (!tournament || tournament.discipline !== "tenis_dobles" || !user) return;
      const { data } = await supabase
        .from("profiles")
        .select("user_id, first_name, last_name")
        .neq("user_id", user.id)
        .order("first_name");
      setPartners(data ?? []);
    };
    loadPartners();
  }, [tournament, user]);

  const myReg = useMemo(
    () =>
      registrations.find(
        (r) =>
          (r.player1_user_id === user?.id || r.player2_user_id === user?.id) &&
          r.status !== "rechazada" &&
          r.status !== "retirada",
      ),
    [registrations, user],
  );

  const totalRounds = useMemo(() => {
    return matches.reduce((max, m) => Math.max(max, m.round), 0);
  }, [matches]);

  const matchesByRound = useMemo(() => {
    const map = new Map<number, Match[]>();
    for (const m of matches) {
      const arr = map.get(m.round) ?? [];
      arr.push(m);
      map.set(m.round, arr);
    }
    for (const arr of map.values()) arr.sort((a, b) => a.bracket_position - b.bracket_position);
    return map;
  }, [matches]);

  const playerLabel = (regId: string | null): string => {
    if (!regId) return "Por definir";
    const r = registrations.find((x) => x.id === regId);
    if (!r) return "—";
    const p1 = profileMap.get(r.player1_user_id);
    const p1Name = p1 ? `${p1.first_name} ${p1.last_name[0] ?? ""}.` : "Socio";
    if (!r.player2_user_id) return p1Name;
    const p2 = profileMap.get(r.player2_user_id);
    const p2Name = p2 ? `${p2.first_name} ${p2.last_name[0] ?? ""}.` : "Socio";
    return `${p1Name} / ${p2Name}`;
  };

  const handleRegister = async () => {
    if (!tournament) return;
    setSubmitting(true);
    const { error } = await supabase.rpc("register_to_tournament", {
      _tournament_id: tournament.id,
      _player2_user_id: tournament.discipline === "tenis_dobles" ? partnerId || null : null,
    });
    setSubmitting(false);
    if (error) {
      toast({ title: "No se pudo inscribir", description: error.message, variant: "destructive" });
      return;
    }
    toast({
      title: "¡Inscripción enviada!",
      description:
        tournament.discipline === "tenis_dobles"
          ? "Esperando que tu pareja confirme."
          : "Pendiente de aprobación del admin.",
    });
    setRegisterOpen(false);
    setPartnerId("");
    loadAll();
  };

  const handleAcceptInvite = async (regId: string) => {
    const { error } = await supabase.rpc("accept_doubles_invitation", { _registration_id: regId });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Invitación aceptada" });
    loadAll();
  };

  const handleRejectInvite = async (regId: string) => {
    const { error } = await supabase.rpc("reject_doubles_invitation", { _registration_id: regId });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Invitación rechazada" });
    loadAll();
  };

  const handleWithdraw = async () => {
    if (!myReg) return;
    if (!confirm("¿Seguro que quieres retirarte del torneo?")) return;
    const { error } = await supabase.rpc("withdraw_from_tournament", { _registration_id: myReg.id });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Te retiraste del torneo" });
    loadAll();
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-warm">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-gradient-warm">
        <p className="text-sm text-muted-foreground">Torneo no encontrado</p>
        <Button variant="outline" onClick={() => navigate("/torneos")}>
          Volver
        </Button>
      </div>
    );
  }

  const status = tournament.status as TournamentStatus;
  const canRegister =
    !myReg &&
    status === "inscripciones_abiertas" &&
    new Date() >= parseISO(tournament.registration_opens_at) &&
    new Date() <= parseISO(tournament.registration_closes_at);
  const pendingInvitesForMe = registrations.filter(
    (r) => r.player2_user_id === user?.id && r.status === "pendiente_pareja",
  );

  return (
    <div className="min-h-screen bg-gradient-warm pb-28">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-md items-center gap-3 px-5 py-4">
          <Link
            to="/torneos"
            className="flex h-9 w-9 items-center justify-center rounded-2xl border border-border bg-card text-muted-foreground hover:text-foreground"
            aria-label="Volver"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="flex-1 truncate font-display text-lg font-semibold">{tournament.name}</h1>
        </div>
      </header>

      <main className="mx-auto max-w-md space-y-4 px-5 pt-4">
        {/* Hero info */}
        <section className="rounded-3xl border border-border bg-card p-5 shadow-card">
          <div className="mb-3 flex items-start justify-between gap-2">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                {DISCIPLINE_LABEL[tournament.discipline]} · {tournament.category}
              </p>
              <h2 className="mt-1 font-display text-xl font-semibold leading-tight">
                {tournament.name}
              </h2>
            </div>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${tournamentStatusColor(status)}`}
            >
              {TOURNAMENT_STATUS_LABEL[status]}
            </span>
          </div>
          {tournament.description && (
            <p className="mb-3 text-sm text-muted-foreground">{tournament.description}</p>
          )}
          <dl className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <dt className="text-muted-foreground">Inscripciones</dt>
              <dd className="font-medium">
                Hasta {format(parseISO(tournament.registration_closes_at), "d MMM HH:mm", { locale: es })}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Inicio</dt>
              <dd className="font-medium">
                {format(parseISO(tournament.starts_at), "d MMM yyyy", { locale: es })}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Superficie</dt>
              <dd className="font-medium">{SURFACE_LABEL[tournament.surface]}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Cupo</dt>
              <dd className="font-medium">
                {registrations.filter((r) => r.status !== "rechazada" && r.status !== "retirada").length} /{" "}
                {tournament.max_participants}
              </dd>
            </div>
          </dl>

          <div className="mt-4 flex flex-col gap-2">
            {canRegister && (
              <Button onClick={() => setRegisterOpen(true)} className="w-full">
                <UserPlus className="mr-2 h-4 w-4" /> Inscribirme
              </Button>
            )}
            {myReg && status !== "finalizado" && status !== "cancelado" && (
              <div className="space-y-2">
                <div
                  className={`rounded-2xl px-3 py-2 text-xs ${registrationStatusColor(myReg.status as RegistrationStatus)}`}
                >
                  Tu estado: {REGISTRATION_STATUS_LABEL[myReg.status as RegistrationStatus]}
                </div>
                {!tournament.bracket_generated_at && (
                  <Button variant="outline" className="w-full" onClick={handleWithdraw}>
                    <X className="mr-2 h-4 w-4" /> Retirarme
                  </Button>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Invitaciones pendientes */}
        {pendingInvitesForMe.length > 0 && (
          <section className="rounded-3xl border border-amber-500/30 bg-amber-500/5 p-4">
            <h3 className="mb-2 font-display text-sm font-semibold">Te invitaron a jugar dobles</h3>
            {pendingInvitesForMe.map((r) => {
              const inv = profileMap.get(r.player1_user_id);
              return (
                <div key={r.id} className="flex items-center justify-between gap-2 py-1">
                  <p className="text-sm">
                    {inv ? `${inv.first_name} ${inv.last_name}` : "Un socio"} te invitó como pareja
                  </p>
                  <div className="flex gap-1">
                    <Button size="sm" onClick={() => handleAcceptInvite(r.id)}>
                      Aceptar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleRejectInvite(r.id)}>
                      Rechazar
                    </Button>
                  </div>
                </div>
              );
            })}
          </section>
        )}

        <Tabs defaultValue="players" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="players">
              <Users className="mr-1.5 h-3.5 w-3.5" /> Inscritos
            </TabsTrigger>
            <TabsTrigger value="bracket" disabled={matches.length === 0}>
              <Trophy className="mr-1.5 h-3.5 w-3.5" /> Llave
            </TabsTrigger>
          </TabsList>

          <TabsContent value="players" className="mt-4 space-y-2">
            {registrations.filter((r) => r.status !== "rechazada" && r.status !== "retirada").length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border bg-card/50 p-6 text-center text-sm text-muted-foreground">
                Aún no hay inscritos.
              </p>
            ) : (
              registrations
                .filter((r) => r.status !== "rechazada" && r.status !== "retirada")
                .map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium">{playerLabel(r.id)}</p>
                      {r.seed && (
                        <p className="text-xs text-muted-foreground">Seed #{r.seed}</p>
                      )}
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${registrationStatusColor(r.status as RegistrationStatus)}`}
                    >
                      {REGISTRATION_STATUS_LABEL[r.status as RegistrationStatus]}
                    </span>
                  </div>
                ))
            )}
          </TabsContent>

          <TabsContent value="bracket" className="mt-4 space-y-4">
            {Array.from(matchesByRound.keys())
              .sort((a, b) => b - a)
              .map((round) => (
                <div key={round} className="space-y-2">
                  <h4 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    {roundLabel(round, totalRounds)}
                  </h4>
                  {matchesByRound.get(round)!.map((m) => {
                    const winA = m.winner_registration_id === m.registration_a_id;
                    const winB = m.winner_registration_id === m.registration_b_id;
                    const myMatch =
                      myReg &&
                      (m.registration_a_id === myReg.id || m.registration_b_id === myReg.id);
                    return (
                      <div
                        key={m.id}
                        className={`rounded-2xl border bg-card p-3 ${myMatch ? "border-primary" : "border-border"}`}
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className={`text-sm ${winA ? "font-semibold" : ""}`}>
                              {playerLabel(m.registration_a_id)}
                            </span>
                            {winA && <Trophy className="h-3.5 w-3.5 text-primary" />}
                          </div>
                          <div className="flex items-center justify-between">
                            <span className={`text-sm ${winB ? "font-semibold" : ""}`}>
                              {playerLabel(m.registration_b_id)}
                            </span>
                            {winB && <Trophy className="h-3.5 w-3.5 text-primary" />}
                          </div>
                        </div>
                        {(m.status === "jugado" || m.status === "walkover") && (
                          <p className="mt-2 border-t border-border pt-2 text-xs text-muted-foreground">
                            {m.walkover ? "W.O." : formatScore(m.score)}
                          </p>
                        )}
                        {m.scheduled_at && m.status !== "jugado" && (
                          <p className="mt-2 flex items-center gap-1 border-t border-border pt-2 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {format(parseISO(m.scheduled_at), "EEE d MMM HH:mm", { locale: es })}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={registerOpen} onOpenChange={setRegisterOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Inscribirse a {tournament.name}</DialogTitle>
            <DialogDescription>
              {tournament.discipline === "tenis_dobles"
                ? "Elige a tu pareja. Recibirá una invitación que deberá aceptar."
                : "Tu inscripción quedará pendiente de aprobación del admin."}
            </DialogDescription>
          </DialogHeader>
          {tournament.discipline === "tenis_dobles" && (
            <div className="py-2">
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Pareja
              </label>
              <Select value={partnerId} onValueChange={setPartnerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Elige a tu pareja" />
                </SelectTrigger>
                <SelectContent>
                  {partners.map((p) => (
                    <SelectItem key={p.user_id} value={p.user_id}>
                      {p.first_name} {p.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRegisterOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleRegister}
              disabled={
                submitting || (tournament.discipline === "tenis_dobles" && !partnerId)
              }
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
};

export default TorneoDetalle;
