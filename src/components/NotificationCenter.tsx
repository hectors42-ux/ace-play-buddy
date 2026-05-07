import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import {
  Bell,
  CalendarCheck,
  CalendarClock,
  Check,
  CheckCheck,
  ClipboardList,
  GraduationCap,
  Handshake,
  Hourglass,
  Loader2,
  Send,
  Swords,
  Timer,
  Trophy,
  UserPlus,
  X,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { useNotificationsFeed, type NotificationKind } from "@/hooks/useNotificationsFeed";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const KIND_META: Record<NotificationKind, { Icon: typeof Bell; tone: string }> = {
  result_proposal: { Icon: Trophy, tone: "text-amber-600 dark:text-amber-400" },
  reschedule_request: { Icon: CalendarClock, tone: "text-primary" },
  doubles_invitation: { Icon: UserPlus, tone: "text-emerald-600 dark:text-emerald-400" },
  admin_registration: { Icon: ClipboardList, tone: "text-violet-600 dark:text-violet-400" },
  ladder_challenge: { Icon: Swords, tone: "text-primary" },
  ladder_challenge_accepted: { Icon: CheckCheck, tone: "text-emerald-600 dark:text-emerald-400" },
  ladder_propose_slots: { Icon: Send, tone: "text-primary" },
  ladder_slots_proposed: { Icon: Hourglass, tone: "text-amber-600 dark:text-amber-400" },
  ladder_result_pending: { Icon: Timer, tone: "text-primary" },
  ladder_result: { Icon: CheckCheck, tone: "text-amber-600 dark:text-amber-400" },
  challenge_expired: { Icon: Timer, tone: "text-destructive" },
  booking_partner: { Icon: Handshake, tone: "text-emerald-600 dark:text-emerald-400" },
  match_acceptance: { Icon: CalendarCheck, tone: "text-primary" },
  class_invitation: { Icon: GraduationCap, tone: "text-violet-600 dark:text-violet-400" },
  partner_invitation: { Icon: UserPlus, tone: "text-primary" },
  partner_invitation_accepted: { Icon: CheckCheck, tone: "text-emerald-600 dark:text-emerald-400" },
  partner_invitation_rejected: { Icon: X, tone: "text-destructive" },

interface Props {
  triggerClassName?: string;
}

export const NotificationCenter = ({ triggerClassName }: Props) => {
  const { items, loading, total, refresh } = useNotificationsFeed();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const respondLadder = async (challengeId: string, accept: boolean) => {
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
    toast({ title: accept ? "Desafío aceptado" : "Desafío rechazado" });
    void refresh();
  };

  const acceptInvitation = async (registrationId: string) => {
    setBusyId(registrationId);
    const { error } = await supabase.rpc("accept_doubles_invitation", {
      _registration_id: registrationId,
    });
    setBusyId(null);
    if (error) {
      toast({
        title: "Error al aceptar",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Invitación aceptada" });
    void refresh();
  };

  const dismissPersistent = async (kind: string, refId: string) => {
    setBusyId(refId);
    const { error } = await supabase
      .from("user_notifications")
      .delete()
      .eq("kind", kind)
      .eq("ref_id", refId);
    setBusyId(null);
    if (error) {
      toast({ title: "No se pudo borrar", description: error.message, variant: "destructive" });
      return;
    }
    void refresh();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Notificaciones${total > 0 ? `, ${total} pendientes` : ""}`}
          className={cn(
            "relative flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-card text-foreground transition-smooth hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            triggerClassName,
          )}
        >
          <Bell className="h-5 w-5" strokeWidth={2} />
          {total > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold leading-none text-destructive-foreground ring-2 ring-background">
              {total > 9 ? "9+" : total}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[22rem] max-w-[calc(100vw-2rem)] p-0"
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="font-display text-sm font-semibold">Notificaciones</p>
          <span className="text-[11px] text-muted-foreground">
            {loading ? "Actualizando…" : total === 0 ? "Al día" : `${total} pendientes`}
          </span>
        </div>
        <ScrollArea className="max-h-[60vh]">
          {loading && items.length === 0 ? (
            <div className="flex items-center justify-center gap-2 py-10 text-xs text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Cargando…
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
              <CheckCheck className="h-8 w-8 text-success" strokeWidth={1.5} />
              <p className="text-sm font-medium">No tienes acciones pendientes</p>
              <p className="text-xs text-muted-foreground">
                Te avisaremos aquí cuando haya algo por responder.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((it) => {
                const meta = KIND_META[it.kind];
                const Icon = meta.Icon;
                const isLadder = it.kind === "ladder_challenge";
                const isInvitation = it.kind === "doubles_invitation";
                const isDismissable = it.kind === "challenge_expired";
                const canQuickAct = isLadder || isInvitation;

                return (
                  <li key={`${it.kind}-${it.ref_id}`} className="px-4 py-3">
                    <div className="flex items-start gap-3">
                      <span
                        className={cn(
                          "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-muted",
                          meta.tone,
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium leading-tight">{it.title}</p>
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                          {it.description}
                        </p>
                        <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground/70">
                          {it.created_at
                            ? formatDistanceToNow(parseISO(it.created_at), {
                                locale: es,
                                addSuffix: true,
                              })
                            : ""}
                        </p>
                      </div>
                    </div>

                    <div className="mt-2 flex items-center gap-2 pl-11">
                      {isLadder && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 flex-1 px-2 text-xs"
                            disabled={busyId === it.ref_id}
                            onClick={() => respondLadder(it.ref_id, false)}
                          >
                            {busyId === it.ref_id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <>
                                <X className="h-3 w-3" /> Rechazar
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="clay"
                            className="h-7 flex-1 px-2 text-xs"
                            disabled={busyId === it.ref_id}
                            onClick={() => respondLadder(it.ref_id, true)}
                          >
                            {busyId === it.ref_id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <>
                                <Check className="h-3 w-3" /> Aceptar
                              </>
                            )}
                          </Button>
                        </>
                      )}
                      {isInvitation && (
                        <Button
                          size="sm"
                          variant="clay"
                          className="h-7 flex-1 px-2 text-xs"
                          disabled={busyId === it.ref_id}
                          onClick={() => acceptInvitation(it.ref_id)}
                        >
                          {busyId === it.ref_id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <>
                              <Check className="h-3 w-3" /> Aceptar
                            </>
                          )}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className={cn(
                          "h-7 px-2 text-xs text-muted-foreground hover:text-foreground",
                          canQuickAct || isDismissable ? "" : "ml-auto",
                        )}
                        onClick={() => {
                          setOpen(false);
                          navigate(it.link);
                        }}
                      >
                        Ver detalles
                      </Button>
                      {isDismissable && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="ml-auto h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                          disabled={busyId === it.ref_id}
                          onClick={() => dismissPersistent(it.kind, it.ref_id)}
                          aria-label="Borrar notificación"
                        >
                          {busyId === it.ref_id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <X className="h-3 w-3" />
                          )}
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};
