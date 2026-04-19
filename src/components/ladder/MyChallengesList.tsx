import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Check, X, Loader2, CalendarClock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  LADDER_CHALLENGE_STATUS_LABEL,
  ladderChallengeStatusColor,
} from "@/lib/ladder-utils";
import type { ChallengeRow, ProfileLite } from "@/hooks/useLadderData";

interface Props {
  challenges: ChallengeRow[];
  profilesById: Record<string, ProfileLite>;
  onChange?: () => void;
}

const fullName = (p?: ProfileLite) =>
  p ? `${p.first_name} ${p.last_name}`.trim() : "Jugador";

export const MyChallengesList = ({ challenges, profilesById, onChange }: Props) => {
  const { user } = useAuth();
  const [busyId, setBusyId] = useState<string | null>(null);

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
    });
    onChange?.();
  };

  return (
    <ul className="space-y-2">
      {mine.map((c) => {
        const isChallenger = c.challenger_user_id === user.id;
        const opponent = profilesById[isChallenger ? c.challenged_user_id : c.challenger_user_id];
        const myPos = isChallenger ? c.challenger_position : c.challenged_position;
        const oppPos = isChallenger ? c.challenged_position : c.challenger_position;
        const canRespond = !isChallenger && c.status === "propuesto";
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
          </li>
        );
      })}
    </ul>
  );
};
