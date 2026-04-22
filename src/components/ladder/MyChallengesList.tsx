import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import {
  Check,
  X,
  Loader2,
  CalendarClock,
  CalendarPlus,
  Eye,
  Send,
  Trophy,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  LADDER_CHALLENGE_STATUS_LABEL,
  ladderChallengeStatusColor,
} from "@/lib/ladder-utils";
import type { ChallengeRow, LadderRow, ProfileLite } from "@/hooks/useLadderData";
import { ChallengeStatusSheet } from "./ChallengeStatusSheet";
import { ProposeSlotsDialog } from "./ProposeSlotsDialog";
import { ConfirmSlotDialog } from "./ConfirmSlotDialog";
import { AddToCalendarButton } from "@/components/shared/AddToCalendarButton";

interface Props {
  challenges: ChallengeRow[];
  profilesById: Record<string, ProfileLite>;
  ladder?: LadderRow | null;
  onChange?: () => void;
}

const fullName = (p?: ProfileLite) =>
  p ? `${p.first_name} ${p.last_name}`.trim() : "Jugador";

export const MyChallengesList = ({ challenges, profilesById, ladder, onChange }: Props) => {
  const { user } = useAuth();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [statusFor, setStatusFor] = useState<ChallengeRow | null>(null);
  const [proposeFor, setProposeFor] = useState<ChallengeRow | null>(null);
  const [confirmFor, setConfirmFor] = useState<ChallengeRow | null>(null);
  const [resultFor, setResultFor] = useState<ChallengeRow | null>(null);

  const mine = useMemo(() => {
    if (!user) return [] as ChallengeRow[];
    return challenges
      .filter(
        (c) =>
          (c.challenger_user_id === user.id || c.challenged_user_id === user.id) &&
          ["propuesto", "aceptado", "programado"].includes(c.status),
      )
      .sort((a, b) => (a.expires_at < b.expires_at ? -1 : 1));
  }, [challenges, user]);

  if (!user) return null;
  if (mine.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
        No tienes desafíos activos.
      </p>
    );
  }

  const respond = async (challengeId: string, accept: boolean) => {
    setBusyId(challengeId);
    const { error } = await supabase.rpc("respond_ladder_challenge", {
      _challenge_id: challengeId,
      _accept: accept,
    });
    setBusyId(null);
    if (error) {
      toast({
        title: "Error al responder",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    toast({
      title: accept ? "Desafío aceptado" : "Desafío rechazado",
      description: accept ? "Ahora propón 3 horarios para jugar." : undefined,
    });
    onChange?.();
    if (accept) {
      const c = challenges.find((x) => x.id === challengeId);
      if (c) setProposeFor(c);
    }
  };

  return (
    <>
      <ul className="space-y-2">
        {mine.map((c) => {
          const isChallenger = c.challenger_user_id === user.id;
          const opponent = profilesById[isChallenger ? c.challenged_user_id : c.challenger_user_id];
          const myPos = isChallenger ? c.challenger_position : c.challenged_position;
          const oppPos = isChallenger ? c.challenged_position : c.challenger_position;
          const canRespond = !isChallenger && c.status === "propuesto";
          const canPropose = !isChallenger && c.status === "aceptado";
          const canConfirm = isChallenger && c.status === "aceptado";
          const isScheduled = c.status === "programado" && c.scheduled_at;
          const matchInPast =
            isScheduled && c.scheduled_at && parseISO(c.scheduled_at) < new Date();

          return (
            <li
              key={c.id}
              className="rounded-2xl border border-border bg-card p-3 shadow-card"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs text-muted-foreground">
                    {isChallenger ? "Desafías a" : "Te desafía"}
                  </p>
                  <p className="font-display text-sm font-semibold">{fullName(opponent)}</p>
                  <p className="text-[11px] text-muted-foreground">
                    Tú #{myPos} → vs #{oppPos}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium ${ladderChallengeStatusColor(c.status)}`}
                >
                  {LADDER_CHALLENGE_STATUS_LABEL[c.status]}
                </span>
              </div>

              {c.scheduled_at && (
                <p className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
                  <CalendarClock className="h-3 w-3" />
                  {format(parseISO(c.scheduled_at), "EEE d MMM, HH:mm 'h'", { locale: es })}
                </p>
              )}
              {!c.scheduled_at && c.status !== "jugado" && (
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Vence {format(parseISO(c.expires_at), "d MMM HH:mm", { locale: es })}
                </p>
              )}

              {/* Acciones según estado */}
              {canRespond && (
                <div className="mt-3 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => respond(c.id, false)}
                    disabled={busyId === c.id}
                  >
                    {busyId === c.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <>
                        <X className="h-3.5 w-3.5" /> Rechazar
                      </>
                    )}
                  </Button>
                  <Button
                    variant="clay"
                    size="sm"
                    className="flex-1"
                    onClick={() => respond(c.id, true)}
                    disabled={busyId === c.id}
                  >
                    {busyId === c.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <>
                        <Check className="h-3.5 w-3.5" /> Aceptar
                      </>
                    )}
                  </Button>
                </div>
              )}

              {canPropose && (
                <div className="mt-3 flex gap-2">
                  <Button
                    variant="clay"
                    size="sm"
                    className="flex-1 gap-1.5"
                    onClick={() => setProposeFor(c)}
                  >
                    <Send className="h-3.5 w-3.5" /> Proponer 3 horarios
                  </Button>
                </div>
              )}

              {canConfirm && (
                <div className="mt-3 flex gap-2">
                  <Button
                    variant="clay"
                    size="sm"
                    className="flex-1 gap-1.5"
                    onClick={() => setConfirmFor(c)}
                  >
                    <Check className="h-3.5 w-3.5" /> Elegir horario
                  </Button>
                </div>
              )}

              {isScheduled && !matchInPast && (
                <div className="mt-3">
                  <AddToCalendarButton
                    title={`Pirámide vs ${fullName(opponent)}`}
                    description={`Desafío ${ladder?.name ?? "pirámide"} · #${myPos} vs #${oppPos}`}
                    startsAt={c.scheduled_at!}
                    endsAt={new Date(parseISO(c.scheduled_at!).getTime() + 60 * 60 * 1000)}
                    filename={`piramide-${c.id}.ics`}
                    className="w-full"
                  />
                </div>
              )}

              {matchInPast && c.status === "programado" && !c.winner_user_id && (
                <div className="mt-3 flex gap-2">
                  <Button
                    variant="clay"
                    size="sm"
                    className="flex-1 gap-1.5"
                    onClick={() => setResultFor(c)}
                  >
                    <Trophy className="h-3.5 w-3.5" /> Cargar resultado
                  </Button>
                </div>
              )}

              {/* Botón ver estado siempre disponible */}
              <button
                type="button"
                onClick={() => setStatusFor(c)}
                className="mt-2 flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
              >
                <Eye className="h-3 w-3" /> Ver estado
              </button>
            </li>
          );
        })}
      </ul>

      {statusFor && (
        <ChallengeStatusSheet
          open={!!statusFor}
          onOpenChange={(o) => !o && setStatusFor(null)}
          challenge={statusFor}
          opponent={
            profilesById[
              statusFor.challenger_user_id === user.id
                ? statusFor.challenged_user_id
                : statusFor.challenger_user_id
            ]
          }
          isChallenger={statusFor.challenger_user_id === user.id}
          responseWindowHours={ladder?.response_window_hours ?? 48}
          challengeWindowDays={ladder?.challenge_window_days ?? 7}
        />
      )}

      {proposeFor && ladder && (
        <ProposeSlotsDialog
          open={!!proposeFor}
          onOpenChange={(o) => !o && setProposeFor(null)}
          challengeId={proposeFor.id}
          tenantId={proposeFor.tenant_id}
          windowDays={ladder.challenge_window_days}
          onProposed={() => {
            setProposeFor(null);
            onChange?.();
          }}
        />
      )}

      {confirmFor && (
        <ConfirmSlotDialog
          open={!!confirmFor}
          onOpenChange={(o) => !o && setConfirmFor(null)}
          challengeId={confirmFor.id}
          onConfirmed={() => {
            setConfirmFor(null);
            onChange?.();
          }}
        />
      )}

      {resultFor && (
        <ResultDialog
          challenge={resultFor}
          opponent={
            profilesById[
              resultFor.challenger_user_id === user.id
                ? resultFor.challenged_user_id
                : resultFor.challenger_user_id
            ]
          }
          onClose={() => setResultFor(null)}
          onSubmitted={() => {
            setResultFor(null);
            onChange?.();
          }}
        />
      )}
    </>
  );
};

// Inline lightweight result dialog
interface ResultDialogProps {
  challenge: ChallengeRow;
  opponent?: ProfileLite;
  onClose: () => void;
  onSubmitted: () => void;
}

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const ResultDialog = ({ challenge, opponent, onClose, onSubmitted }: ResultDialogProps) => {
  const { user } = useAuth();
  const [winner, setWinner] = useState<"me" | "opponent">("me");
  const [set1Me, setSet1Me] = useState("");
  const [set1Opp, setSet1Opp] = useState("");
  const [set2Me, setSet2Me] = useState("");
  const [set2Opp, setSet2Opp] = useState("");
  const [set3Me, setSet3Me] = useState("");
  const [set3Opp, setSet3Opp] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!user) return null;
  const isChallenger = challenge.challenger_user_id === user.id;
  const myUserId = user.id;
  const opponentId = isChallenger ? challenge.challenged_user_id : challenge.challenger_user_id;

  const handleSubmit = async () => {
    const winnerUserId = winner === "me" ? myUserId : opponentId;
    const sets: Array<{ a: number; b: number }> = [];
    const push = (a: string, b: string) => {
      const ai = parseInt(a, 10);
      const bi = parseInt(b, 10);
      if (Number.isFinite(ai) && Number.isFinite(bi)) {
        // a = challenger, b = challenged
        sets.push(
          isChallenger
            ? { a: ai, b: bi }
            : { a: bi, b: ai },
        );
      }
    };
    push(set1Me, set1Opp);
    push(set2Me, set2Opp);
    push(set3Me, set3Opp);
    if (sets.length < 2) {
      toast({ title: "Carga al menos 2 sets", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.rpc("submit_ladder_result", {
      _challenge_id: challenge.id,
      _winner_user_id: winnerUserId,
      _score: sets,
    });
    setSubmitting(false);
    if (error) {
      toast({
        title: "No se pudo cargar el resultado",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "Resultado enviado",
      description: "Tu rival debe confirmarlo para que cuente.",
    });
    onSubmitted();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <Trophy className="h-5 w-5 text-primary" /> Cargar resultado
          </DialogTitle>
          <DialogDescription>
            Partido vs {fullName(opponent)}. Tu rival deberá confirmarlo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-xs">¿Quién ganó?</Label>
            <RadioGroup
              value={winner}
              onValueChange={(v) => setWinner(v as "me" | "opponent")}
              className="mt-2 grid grid-cols-2 gap-2"
            >
              <Label className="flex cursor-pointer items-center gap-2 rounded-2xl border border-border p-2 text-xs has-[input:checked]:border-primary has-[input:checked]:bg-primary/10">
                <RadioGroupItem value="me" /> Yo
              </Label>
              <Label className="flex cursor-pointer items-center gap-2 rounded-2xl border border-border p-2 text-xs has-[input:checked]:border-primary has-[input:checked]:bg-primary/10">
                <RadioGroupItem value="opponent" /> {fullName(opponent)}
              </Label>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Sets (yo - rival)</Label>
            {[
              { l: "Set 1", a: set1Me, b: set1Opp, sa: setSet1Me, sb: setSet1Opp },
              { l: "Set 2", a: set2Me, b: set2Opp, sa: setSet2Me, sb: setSet2Opp },
              { l: "Set 3", a: set3Me, b: set3Opp, sa: setSet3Me, sb: setSet3Opp },
            ].map((row) => (
              <div key={row.l} className="flex items-center gap-2">
                <span className="w-12 text-[11px] text-muted-foreground">{row.l}</span>
                <Input
                  type="number"
                  min="0"
                  max="7"
                  value={row.a}
                  onChange={(e) => row.sa(e.target.value)}
                  className="h-9"
                />
                <span className="text-muted-foreground">-</span>
                <Input
                  type="number"
                  min="0"
                  max="7"
                  value={row.b}
                  onChange={(e) => row.sb(e.target.value)}
                  className="h-9"
                />
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={submitting} className="flex-1">
            Cancelar
          </Button>
          <Button variant="clay" onClick={handleSubmit} disabled={submitting} className="flex-1">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enviar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
