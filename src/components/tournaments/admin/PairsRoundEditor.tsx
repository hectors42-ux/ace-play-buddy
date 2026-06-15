import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { HapticButton } from "@/components/feedback/HapticButton";
import { haptic } from "@/lib/feedback/haptic";
import { useRoundPairs } from "@/hooks/useRoundPairs";
import type { AmericanoRound } from "@/hooks/useAmericanoRounds";
import type { Tables } from "@/integrations/supabase/types";
import { RoundSelectorSheet } from "./RoundSelectorSheet";
import { CourtPairCard } from "./CourtPairCard";

type Court = Pick<Tables<"courts">, "id" | "name">;
type Session = { id: string };

interface PendingSwap {
  from_user_id: string;
  to_user_id: string;
  match_id: string;
}

interface Props {
  round: AmericanoRound;
  rounds: AmericanoRound[];
  categoryId: string;
  tournamentId: string;
  courts: Court[];
  currentSession: Session | null;
  onChangeRound: (r: AmericanoRound) => void;
  onSaved: () => void;
}

const LOCK_STATUSES = new Set(["jugado", "walkover", "interrumpido"]);

export function PairsRoundEditor({
  round,
  rounds,
  categoryId,
  tournamentId,
  courts,
  currentSession,
  onChangeRound,
  onSaved,
}: Props) {
  const { matches, players, availabilityByUser, loading, reload } = useRoundPairs({
    roundId: round.id,
    categoryId,
    tournamentId,
  });

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingSwap[]>([]);
  const [saving, setSaving] = useState(false);
  const [localMatches, setLocalMatches] = useState(matches);

  useEffect(() => {
    setLocalMatches(matches);
    setPending([]);
    setSelectedUserId(null);
    setSelectedMatchId(null);
  }, [matches, round.id]);

  const courtName = (id: string | null) => {
    if (!id) return "Cancha";
    return courts.find((c) => c.id === id)?.name ?? "Cancha";
  };

  const disabledUserIds = useMemo(() => {
    if (!selectedUserId || !currentSession) return new Set<string>();
    const set = new Set<string>();
    // Cuando hay un seleccionado, deshabilita jugadores que no tengan disponibilidad para la sesión
    localMatches.forEach((m) => {
      [...(m.side_a_user_ids ?? []), ...(m.side_b_user_ids ?? [])].forEach((u) => {
        if (!u || u === selectedUserId) return;
        const av = availabilityByUser.get(u);
        if (av && av.length > 0 && !av.includes(currentSession.id)) set.add(u);
      });
    });
    return set;
  }, [selectedUserId, currentSession, localMatches, availabilityByUser]);

  const handleTap = (matchId: string, userId: string) => {
    if (!selectedUserId) {
      setSelectedUserId(userId);
      setSelectedMatchId(matchId);
      return;
    }
    if (selectedUserId === userId) {
      setSelectedUserId(null);
      setSelectedMatchId(null);
      return;
    }
    // Swap local
    const next = localMatches.map((m) => {
      const a = [...(m.side_a_user_ids ?? [])];
      const b = [...(m.side_b_user_ids ?? [])];
      const replace = (arr: string[]) =>
        arr.map((u) => (u === selectedUserId ? userId : u === userId ? selectedUserId : u));
      return { ...m, side_a_user_ids: replace(a), side_b_user_ids: replace(b) };
    });
    setLocalMatches(next);
    setPending((prev) => [
      ...prev,
      { from_user_id: selectedUserId, to_user_id: userId, match_id: selectedMatchId ?? matchId },
    ]);
    setSelectedUserId(null);
    setSelectedMatchId(null);
    haptic("medium");
  };

  const handleSave = async () => {
    if (pending.length === 0) return;
    setSaving(true);
    const { data, error } = await (supabase.rpc as unknown as (
      fn: string,
      params: Record<string, unknown>,
    ) => Promise<{ data: unknown; error: { message: string } | null }>)(
      "swap_americano_players",
      { _round_id: round.id, _swaps: pending },
    );
    setSaving(false);
    if (error) {
      haptic("warning");
      toast({ title: "No se pudo guardar", description: error.message, variant: "destructive" });
      return;
    }
    const affected = (data as { affected_count?: number } | null)?.affected_count ?? 0;
    haptic("success");
    toast({ title: "Parejas actualizadas", description: `${affected} jugador(es) avisados.` });
    setPending([]);
    await reload();
    onSaved();
    // Broadcast realtime para otras pantallas
    const channel = supabase.channel(`tournament:${tournamentId}:round:${round.id}`);
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        channel.send({
          type: "broadcast",
          event: "partner_changed",
          payload: { round_id: round.id },
        });
        setTimeout(() => supabase.removeChannel(channel), 500);
      }
    });
  };

  return (
    <section className="space-y-3">
      <header className="flex items-center justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-muted-foreground">
            Ronda {round.round_number} · Parejas
          </p>
          {round.status === "finalizada" && (
            <p className="mt-1 text-xs text-amber-700">
              Ronda finalizada — los resultados se invalidan al editar.
            </p>
          )}
        </div>
        <RoundSelectorSheet rounds={rounds} currentRoundId={round.id} onSelect={onChangeRound} />
      </header>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : localMatches.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Esta ronda aún no tiene canchas.
        </p>
      ) : (
        <div className="space-y-2">
          {localMatches.map((m) => (
            <CourtPairCard
              key={m.id}
              match={m}
              courtLabel={courtName(m.court_id)}
              players={players}
              selectedUserId={selectedUserId}
              selectedMatchId={selectedMatchId}
              onTapPlayer={handleTap}
              disabledUserIds={disabledUserIds}
              locked={LOCK_STATUSES.has(m.status)}
            />
          ))}
        </div>
      )}

      <p className="text-center text-xs text-muted-foreground">
        Los cambios se notifican a los jugadores y actualizan su agenda al instante.
      </p>

      {pending.length > 0 && (
        <div className="sticky bottom-2 z-10">
          <HapticButton
            level="heavy"
            onClick={handleSave}
            disabled={saving}
            className="w-full"
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar parejas de la ronda ({pending.length})
          </HapticButton>
        </div>
      )}
    </section>
  );
}