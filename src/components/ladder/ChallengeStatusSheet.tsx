import { useEffect, useMemo, useState } from "react";
import { format, formatDistanceToNowStrict, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import {
  CalendarCheck,
  CalendarClock,
  Check,
  CheckCircle2,
  Clock,
  Hourglass,
  Swords,
  X,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { LADDER_CHALLENGE_STATUS_LABEL } from "@/lib/ladder-utils";
import type { ChallengeRow, ProfileLite } from "@/hooks/useLadderData";

interface ChallengeStatusSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  challenge: ChallengeRow | null;
  opponent?: ProfileLite;
  isChallenger: boolean;
  responseWindowHours: number;
  challengeWindowDays: number;
}

interface Step {
  id: string;
  label: string;
  description: string;
  status: "done" | "current" | "todo";
  Icon: typeof Swords;
}

const fullName = (p?: ProfileLite) =>
  p ? `${p.first_name} ${p.last_name}`.trim() : "Tu rival";

export const ChallengeStatusSheet = ({
  open,
  onOpenChange,
  challenge,
  opponent,
  isChallenger,
  responseWindowHours,
  challengeWindowDays,
}: ChallengeStatusSheetProps) => {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!open) return;
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, [open]);

  const countdown = useMemo(() => {
    if (!challenge) return null;
    const target = parseISO(challenge.expires_at);
    if (target <= now) {
      return { label: "Expirado", overdue: true };
    }
    return {
      label: formatDistanceToNowStrict(target, { locale: es, addSuffix: false }),
      overdue: false,
    };
  }, [challenge, now]);

  const steps: Step[] = useMemo(() => {
    if (!challenge) return [];
    const s = challenge.status;
    return [
      {
        id: "sent",
        label: "Desafío enviado",
        description: isChallenger ? "Esperando que tu rival responda" : "Recibiste un reto",
        status: "done",
        Icon: Swords,
      },
      {
        id: "accepted",
        label: "Reto aceptado",
        description: isChallenger
          ? "Tu rival debe proponer 3 horarios"
          : "Propón 3 horarios para jugar",
        status:
          s === "propuesto" ? "todo" : s === "aceptado" ? "current" : "done",
        Icon: Check,
      },
      {
        id: "scheduled",
        label: "Partido programado",
        description: challenge.scheduled_at
          ? format(parseISO(challenge.scheduled_at), "EEE d MMM, HH:mm 'h'", { locale: es })
          : "Cancha y hora confirmadas",
        status:
          s === "programado" || s === "jugado"
            ? s === "programado"
              ? "current"
              : "done"
            : "todo",
        Icon: CalendarCheck,
      },
      {
        id: "played",
        label: "Resultado cargado",
        description:
          s === "jugado"
            ? "Pirámide actualizada"
            : "Tras el partido carga el resultado",
        status: s === "jugado" ? "done" : "todo",
        Icon: CheckCircle2,
      },
    ];
  }, [challenge, isChallenger]);

  if (!challenge) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl">
        <SheetHeader className="text-left">
          <SheetTitle className="flex items-center gap-2 font-display">
            <Swords className="h-5 w-5 text-primary" />
            Estado del desafío
          </SheetTitle>
          <SheetDescription>
            {isChallenger ? "Desafías a" : "Te desafía"}{" "}
            <strong className="text-foreground">{fullName(opponent)}</strong> · #
            {isChallenger ? challenge.challenged_position : challenge.challenger_position}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          {/* Cuenta regresiva */}
          <div
            className={cn(
              "rounded-2xl border p-4 text-center",
              countdown?.overdue
                ? "border-destructive/40 bg-destructive/10"
                : "border-primary/30 bg-primary/5",
            )}
          >
            <div className="mb-1 flex items-center justify-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {challenge.status === "propuesto" ? (
                <>
                  <Hourglass className="h-3 w-3" /> Tiempo para responder
                </>
              ) : challenge.status === "aceptado" ? (
                <>
                  <CalendarClock className="h-3 w-3" /> Ventana para programar
                </>
              ) : (
                <>
                  <Clock className="h-3 w-3" /> Estado
                </>
              )}
            </div>
            <p className="font-display text-2xl font-bold text-foreground">
              {countdown?.label ?? "—"}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {challenge.status === "propuesto"
                ? `Ventana total: ${responseWindowHours}h`
                : challenge.status === "aceptado"
                  ? `Hasta ${challengeWindowDays} días para jugar`
                  : LADDER_CHALLENGE_STATUS_LABEL[challenge.status]}
            </p>
          </div>

          {/* Timeline */}
          <ol className="space-y-3">
            {steps.map((step, i) => {
              const Icon = step.Icon;
              const isLast = i === steps.length - 1;
              return (
                <li key={step.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-full border-2",
                        step.status === "done"
                          ? "border-primary bg-primary text-primary-foreground"
                          : step.status === "current"
                            ? "border-primary bg-background text-primary"
                            : "border-border bg-background text-muted-foreground",
                      )}
                    >
                      {step.status === "done" ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Icon className="h-4 w-4" />
                      )}
                    </span>
                    {!isLast && (
                      <span
                        className={cn(
                          "mt-1 h-6 w-0.5",
                          step.status === "done" ? "bg-primary" : "bg-border",
                        )}
                      />
                    )}
                  </div>
                  <div className="flex-1 pb-3">
                    <p
                      className={cn(
                        "text-sm font-semibold",
                        step.status === "todo" && "text-muted-foreground",
                      )}
                    >
                      {step.label}
                    </p>
                    <p className="text-[11px] text-muted-foreground">{step.description}</p>
                  </div>
                </li>
              );
            })}
          </ol>

          {challenge.status === "rechazado" && (
            <div className="flex items-start gap-2 rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive-foreground">
              <X className="mt-0.5 h-4 w-4" />
              <span>El desafío fue rechazado.</span>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
