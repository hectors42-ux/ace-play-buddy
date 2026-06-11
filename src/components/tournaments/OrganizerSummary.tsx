import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Flag,
  Loader2,
  RefreshCw,
  Trophy,
  UserPlus,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  tournamentId: string;
}

interface CategoryRow {
  id: string;
  name: string;
  max_participants: number;
  bracket_generated_at: string | null;
  status: string;
}

interface Counts {
  pendingApprovals: number;
  unscheduled: number;
  resultDisputes: number;
  rescheduleRequests: number;
  readyToFreeze: { catId: string; name: string }[];
  readyToFinalize: { catId: string; name: string }[];
  reviewFlags: number;
  playedTotal: number;
  matchesTotal: number;
  totalRegistered: number;
}

const initialCounts: Counts = {
  pendingApprovals: 0,
  unscheduled: 0,
  resultDisputes: 0,
  rescheduleRequests: 0,
  readyToFreeze: [],
  readyToFinalize: [],
  reviewFlags: 0,
  playedTotal: 0,
  matchesTotal: 0,
  totalRegistered: 0,
};

export const OrganizerSummary = ({ tournamentId }: Props) => {
  const [counts, setCounts] = useState<Counts>(initialCounts);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [{ data: cats }, { data: regs }, { data: matches }, { data: proposals }, { data: resch }, { data: flags }] =
      await Promise.all([
        supabase
          .from("tournament_categories")
          .select("id,name,max_participants,bracket_generated_at,status")
          .eq("tournament_id", tournamentId),
        supabase
          .from("tournament_registrations")
          .select("id,tournament_category_id,status")
          .eq("tournament_id", tournamentId),
        supabase
          .from("tournament_matches")
          .select("id,tournament_category_id,status,scheduled_at,registration_a_id,registration_b_id")
          .eq("tournament_id", tournamentId),
        supabase
          .from("tournament_match_results")
          .select("id,match_id,status")
          .eq("status", "propuesto"),
        supabase
          .from("tournament_match_reschedule_requests")
          .select("id,match_id,status")
          .eq("status", "pendiente"),
        supabase.from("tournament_match_review_flags").select("tournament_match_id"),
      ]);

    const categories = (cats ?? []) as CategoryRow[];
    const catIds = new Set(categories.map((c) => c.id));

    const myMatchIds = new Set(
      (matches ?? []).filter((m) => catIds.has(m.tournament_category_id)).map((m) => m.id),
    );
    const myRegs = (regs ?? []).filter((r) => catIds.has(r.tournament_category_id));

    const confirmedByCat = new Map<string, number>();
    myRegs.forEach((r) => {
      if (r.status === "confirmada") {
        confirmedByCat.set(r.tournament_category_id, (confirmedByCat.get(r.tournament_category_id) ?? 0) + 1);
      }
    });

    const matchesByCat = new Map<string, { total: number; played: number }>();
    (matches ?? [])
      .filter((m) => catIds.has(m.tournament_category_id))
      .forEach((m) => {
        const prev = matchesByCat.get(m.tournament_category_id) ?? { total: 0, played: 0 };
        prev.total += 1;
        if (m.status === "jugado" || m.status === "walkover") prev.played += 1;
        matchesByCat.set(m.tournament_category_id, prev);
      });

    const readyToFreeze = categories
      .filter(
        (c) =>
          !c.bracket_generated_at &&
          (confirmedByCat.get(c.id) ?? 0) >= c.max_participants,
      )
      .map((c) => ({ catId: c.id, name: c.name }));

    const readyToFinalize = categories
      .filter((c) => {
        const mm = matchesByCat.get(c.id);
        return c.status === "en_curso" && mm && mm.total > 0 && mm.played === mm.total;
      })
      .map((c) => ({ catId: c.id, name: c.name }));

    let playedTotal = 0;
    let matchesTotal = 0;
    matchesByCat.forEach((v) => {
      playedTotal += v.played;
      matchesTotal += v.total;
    });

    setCounts({
      pendingApprovals: myRegs.filter((r) => r.status === "pendiente_admin").length,
      unscheduled: (matches ?? []).filter(
        (m) =>
          catIds.has(m.tournament_category_id) &&
          m.status === "pendiente" &&
          m.registration_a_id &&
          m.registration_b_id &&
          !m.scheduled_at,
      ).length,
      resultDisputes: (proposals ?? []).filter((p) => myMatchIds.has(p.match_id)).length,
      rescheduleRequests: (resch ?? []).filter((r) => myMatchIds.has(r.match_id)).length,
      readyToFreeze,
      readyToFinalize,
      reviewFlags: (flags ?? []).filter((f) => myMatchIds.has(f.tournament_match_id)).length,
      playedTotal,
      matchesTotal,
      totalRegistered: myRegs.filter((r) => r.status === "confirmada").length,
    });
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentId]);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  const pct = counts.matchesTotal > 0 ? Math.round((counts.playedTotal / counts.matchesTotal) * 100) : 0;

  const alerts: Array<{
    key: string;
    icon: typeof AlertCircle;
    title: string;
    detail: string;
    href?: string;
    tone: "warn" | "info" | "danger";
  }> = [];

  if (counts.pendingApprovals > 0)
    alerts.push({
      key: "approvals",
      icon: UserPlus,
      title: `${counts.pendingApprovals} inscripción(es) pendiente(s) de aprobación`,
      detail: "Aprueba o rechaza desde la categoría correspondiente.",
      tone: "warn",
    });
  if (counts.resultDisputes > 0)
    alerts.push({
      key: "results",
      icon: AlertCircle,
      title: `${counts.resultDisputes} resultado(s) en disputa`,
      detail: "Hay propuestas de resultado esperando confirmación.",
      tone: "danger",
    });
  if (counts.rescheduleRequests > 0)
    alerts.push({
      key: "reschedule",
      icon: CalendarClock,
      title: `${counts.rescheduleRequests} solicitud(es) de reprogramación`,
      detail: "Resuelve las propuestas pendientes.",
      tone: "info",
    });
  if (counts.unscheduled > 0)
    alerts.push({
      key: "unscheduled",
      icon: CalendarClock,
      title: `${counts.unscheduled} partido(s) sin agendar`,
      detail: "Asigna cancha y horario en la categoría.",
      tone: "info",
    });
  counts.readyToFreeze.forEach((c) =>
    alerts.push({
      key: `freeze-${c.catId}`,
      icon: Trophy,
      title: `Categoría "${c.name}" lista para cerrar inscripciones`,
      detail: "Cupo completo. Puedes generar el cuadro.",
      href: `/admin/torneos/${tournamentId}/cat/${c.catId}`,
      tone: "info",
    }),
  );
  counts.readyToFinalize.forEach((c) =>
    alerts.push({
      key: `finalize-${c.catId}`,
      icon: CheckCircle2,
      title: `Categoría "${c.name}" lista para finalizar`,
      detail: "Todos los partidos están jugados.",
      href: `/admin/torneos/${tournamentId}/cat/${c.catId}`,
      tone: "info",
    }),
  );
  if (counts.reviewFlags > 0)
    alerts.push({
      key: "review",
      icon: Flag,
      title: `${counts.reviewFlags} partido(s) marcado(s) para revisión`,
      detail: "Se corrigió un resultado previo. Verifica los dependientes.",
      tone: "warn",
    });

  const toneClass = (t: "warn" | "info" | "danger") =>
    t === "danger"
      ? "border-destructive/40 bg-destructive/5"
      : t === "warn"
        ? "border-amber-500/40 bg-amber-500/5"
        : "border-primary/30 bg-primary/5";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-2xl border border-border bg-card p-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Avance</p>
          <p className="font-display text-xl font-semibold">{pct}%</p>
          <p className="text-[10px] text-muted-foreground">
            {counts.playedTotal}/{counts.matchesTotal} partidos
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Inscritos</p>
          <p className="font-display text-xl font-semibold">{counts.totalRegistered}</p>
          <p className="text-[10px] text-muted-foreground">confirmados</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Atención</p>
          <p className="font-display text-xl font-semibold">{alerts.length}</p>
          <p className="text-[10px] text-muted-foreground">alertas</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Atención requerida
        </h3>
        <button
          type="button"
          onClick={load}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <RefreshCw className="h-3 w-3" /> Refrescar
        </button>
      </div>

      {alerts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center">
          <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-emerald-500" />
          <p className="text-sm font-medium">Todo en orden</p>
          <p className="text-xs text-muted-foreground">No hay alertas activas en este torneo.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {alerts.map((a) => {
            const Icon = a.icon;
            const inner = (
              <div className={`flex items-start gap-3 rounded-2xl border p-3 ${toneClass(a.tone)}`}>
                <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{a.title}</p>
                  <p className="text-xs text-muted-foreground">{a.detail}</p>
                </div>
                {a.href && <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
              </div>
            );
            return a.href ? (
              <Link key={a.key} to={a.href}>
                {inner}
              </Link>
            ) : (
              <div key={a.key}>{inner}</div>
            );
          })}
        </div>
      )}
    </div>
  );
};