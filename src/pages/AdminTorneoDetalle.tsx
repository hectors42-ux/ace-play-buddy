import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Check, Loader2, Trophy, X, Zap } from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import {
  DISCIPLINE_LABEL,
  REGISTRATION_STATUS_LABEL,
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

const AdminTorneoDetalle = () => {
  const { id } = useParams<{ id: string }>();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [profileMap, setProfileMap] = useState<Map<string, Profile>>(new Map());
  const [loading, setLoading] = useState(true);
  const [resultMatch, setResultMatch] = useState<Match | null>(null);
  const [winnerId, setWinnerId] = useState<string>("");
  const [scoreSets, setScoreSets] = useState<Array<{ a: string; b: string }>>([
    { a: "", b: "" },
    { a: "", b: "" },
  ]);
  const [walkover, setWalkover] = useState(false);

  const load = async () => {
    if (!id) return;
    const { data: t } = await supabase.from("tournaments").select("*").eq("id", id).maybeSingle();
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
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const totalRounds = useMemo(
    () => matches.reduce((max, m) => Math.max(max, m.round), 0),
    [matches],
  );

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

  const handleConfirmReg = async (regId: string, status: "confirmada" | "rechazada") => {
    const { error } = await supabase
      .from("tournament_registrations")
      .update({ status, confirmed_at: status === "confirmada" ? new Date().toISOString() : null })
      .eq("id", regId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: status === "confirmada" ? "Inscripción confirmada" : "Inscripción rechazada" });
    load();
  };

  const handleGenerateBracket = async () => {
    if (!tournament) return;
    if (!confirm("¿Generar la llave? No se podrá deshacer.")) return;
    const { error } = await supabase.rpc("generate_bracket", { _tournament_id: tournament.id });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Llave generada", description: "El torneo está en curso." });
    load();
  };

  const openResult = (m: Match) => {
    setResultMatch(m);
    setWinnerId("");
    setScoreSets([
      { a: "", b: "" },
      { a: "", b: "" },
    ]);
    setWalkover(false);
  };

  const handleSaveResult = async () => {
    if (!resultMatch || !winnerId) return;
    const score = walkover
      ? null
      : scoreSets
          .filter((s) => s.a !== "" && s.b !== "")
          .map((s, i) => ({ set: i + 1, a: Number(s.a), b: Number(s.b) }));
    const { error } = await supabase.rpc("record_match_result", {
      _match_id: resultMatch.id,
      _winner_registration_id: winnerId,
      _score: score,
      _walkover: walkover,
      _retired: false,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Resultado registrado" });
    setResultMatch(null);
    load();
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
        <Link to="/admin/torneos">
          <Button variant="outline">Volver</Button>
        </Link>
      </div>
    );
  }

  const status = tournament.status as TournamentStatus;
  const confirmedCount = registrations.filter((r) => r.status === "confirmada").length;

  return (
    <div className="min-h-screen bg-gradient-warm pb-12">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-5 py-4">
          <Link
            to="/admin/torneos"
            className="flex h-9 w-9 items-center justify-center rounded-2xl border border-border bg-card text-muted-foreground hover:text-foreground"
            aria-label="Volver"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex-1">
            <h1 className="font-display text-lg font-semibold">{tournament.name}</h1>
            <p className="text-xs text-muted-foreground">
              {DISCIPLINE_LABEL[tournament.discipline]} · {tournament.category}
            </p>
          </div>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${tournamentStatusColor(status)}`}
          >
            {TOURNAMENT_STATUS_LABEL[status]}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-4 px-5 pt-4">
        <Tabs defaultValue="regs" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="regs">Inscripciones ({registrations.length})</TabsTrigger>
            <TabsTrigger value="bracket">Llave ({matches.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="regs" className="mt-4 space-y-3">
            {!tournament.bracket_generated_at && confirmedCount >= 2 && (
              <Button onClick={handleGenerateBracket} className="w-full">
                <Zap className="mr-2 h-4 w-4" />
                Generar llave ({confirmedCount} confirmados)
              </Button>
            )}
            {registrations.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border bg-card/50 p-6 text-center text-sm text-muted-foreground">
                Aún no hay inscripciones.
              </p>
            ) : (
              registrations.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{playerLabel(r.id)}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(parseISO(r.registered_at), "d MMM HH:mm", { locale: es })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${registrationStatusColor(r.status as RegistrationStatus)}`}
                    >
                      {REGISTRATION_STATUS_LABEL[r.status as RegistrationStatus]}
                    </span>
                    {r.status === "pendiente_admin" && !tournament.bracket_generated_at && (
                      <>
                        <Button size="icon" variant="outline" onClick={() => handleConfirmReg(r.id, "confirmada")}>
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => handleConfirmReg(r.id, "rechazada")}>
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="bracket" className="mt-4 space-y-4">
            {matches.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border bg-card/50 p-6 text-center text-sm text-muted-foreground">
                La llave aún no se ha generado.
              </p>
            ) : (
              Array.from(matchesByRound.keys())
                .sort((a, b) => b - a)
                .map((round) => (
                  <div key={round} className="space-y-2">
                    <h4 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                      {roundLabel(round, totalRounds)}
                    </h4>
                    {matchesByRound.get(round)!.map((m) => {
                      const winA = m.winner_registration_id === m.registration_a_id;
                      const winB = m.winner_registration_id === m.registration_b_id;
                      const canRecord =
                        m.status === "pendiente" &&
                        m.registration_a_id &&
                        m.registration_b_id;
                      return (
                        <div
                          key={m.id}
                          className="rounded-2xl border border-border bg-card p-3"
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
                          {canRecord && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="mt-2 w-full"
                              onClick={() => openResult(m)}
                            >
                              Registrar resultado
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))
            )}
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={!!resultMatch} onOpenChange={(o) => !o && setResultMatch(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar resultado</DialogTitle>
          </DialogHeader>
          {resultMatch && (
            <div className="space-y-3 py-2">
              <div>
                <Label>Ganador</Label>
                <Select value={winnerId} onValueChange={setWinnerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Elige el ganador" />
                  </SelectTrigger>
                  <SelectContent>
                    {resultMatch.registration_a_id && (
                      <SelectItem value={resultMatch.registration_a_id}>
                        {playerLabel(resultMatch.registration_a_id)}
                      </SelectItem>
                    )}
                    {resultMatch.registration_b_id && (
                      <SelectItem value={resultMatch.registration_b_id}>
                        {playerLabel(resultMatch.registration_b_id)}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={walkover}
                  onChange={(e) => setWalkover(e.target.checked)}
                />
                Walkover (sin marcador)
              </label>
              {!walkover && (
                <div className="space-y-2">
                  <Label>Marcador por sets</Label>
                  {scoreSets.map((s, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="w-12 text-xs text-muted-foreground">Set {i + 1}</span>
                      <Input
                        type="number"
                        min={0}
                        max={7}
                        value={s.a}
                        onChange={(e) => {
                          const next = [...scoreSets];
                          next[i] = { ...next[i], a: e.target.value };
                          setScoreSets(next);
                        }}
                        className="w-16"
                      />
                      <span>-</span>
                      <Input
                        type="number"
                        min={0}
                        max={7}
                        value={s.b}
                        onChange={(e) => {
                          const next = [...scoreSets];
                          next[i] = { ...next[i], b: e.target.value };
                          setScoreSets(next);
                        }}
                        className="w-16"
                      />
                    </div>
                  ))}
                  {scoreSets.length < 5 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setScoreSets([...scoreSets, { a: "", b: "" }])}
                    >
                      + Agregar set
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setResultMatch(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveResult} disabled={!winnerId}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminTorneoDetalle;
