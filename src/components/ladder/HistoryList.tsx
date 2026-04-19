import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import type { HistoryRow, ProfileLite } from "@/hooks/useLadderData";

const REASON_LABEL: Record<string, string> = {
  ingreso: "Ingreso",
  retiro: "Retiro",
  desafio_ganado: "Ganó desafío",
  desafio_perdido: "Perdió desafío",
  walkover: "Walkover",
  inactividad: "Inactividad",
  ajuste_admin: "Ajuste admin",
};

interface Props {
  history: HistoryRow[];
  profilesById: Record<string, ProfileLite>;
}

const fullName = (p?: ProfileLite) =>
  p ? `${p.first_name} ${p.last_name}`.trim() : "Jugador";

export const HistoryList = ({ history, profilesById }: Props) => {
  if (history.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
        Aún no hay movimientos en esta pirámide.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {history.map((h) => {
        const before = h.position_before;
        const after = h.position_after;
        const delta = before != null && after != null ? before - after : 0;
        const Icon = delta > 0 ? ArrowUp : delta < 0 ? ArrowDown : Minus;
        const color =
          delta > 0
            ? "text-success"
            : delta < 0
              ? "text-destructive"
              : "text-muted-foreground";
        return (
          <li
            key={h.id}
            className="flex items-start gap-3 rounded-2xl border border-border bg-card p-3 shadow-card"
          >
            <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted ${color}`}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {fullName(profilesById[h.user_id])}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {REASON_LABEL[h.reason] ?? h.reason}
                {before != null && after != null && (
                  <>
                    {" · "}
                    #{before} → #{after}
                  </>
                )}
              </p>
            </div>
            <p className="shrink-0 text-[10px] text-muted-foreground">
              {format(parseISO(h.recorded_at), "d MMM", { locale: es })}
            </p>
          </li>
        );
      })}
    </ul>
  );
};
