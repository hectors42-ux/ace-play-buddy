import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { useTournamentFinance } from "@/hooks/useTournamentFinance";
import { playerName, type Player, type Registration } from "@/hooks/useCategoryData";

interface Props {
  categoryId: string;
  registrations: Registration[];
  players: Map<string, Player>;
  onChanged: () => void;
}

const fmtCLP = (n: number) =>
  new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(n);

export const FinanceTab = ({ categoryId, registrations, players, onChanged }: Props) => {
  const { data: finance, isLoading } = useTournamentFinance(categoryId);
  const [busyId, setBusyId] = useState<string | null>(null);

  const confirmed = registrations.filter((r) => r.status === "confirmada");

  const handleToggle = async (regId: string, paid: boolean, method: string) => {
    setBusyId(regId);
    const { error } = await supabase.rpc("toggle_registration_fee" as never, {
      _registration_id: regId,
      _paid: paid,
      _method: method,
    } as never);
    setBusyId(null);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    onChanged();
  };

  const exportCSV = () => {
    const header = ["inscripcion_id", "jugador", "pareja", "estado", "pagado", "metodo", "monto_clp", "fecha_pago"];
    const rows = confirmed.map((r) => {
      const p1 = playerName(players.get(r.player1_user_id));
      const p2 = r.player2_user_id ? playerName(players.get(r.player2_user_id)) : "";
      const x = r as Registration & {
        fee_paid_at?: string | null;
        fee_amount_clp?: number | null;
        fee_method?: string | null;
      };
      return [
        r.id,
        p1,
        p2,
        r.status,
        x.fee_paid_at ? "sí" : "no",
        x.fee_method ?? "",
        x.fee_amount_clp ?? "",
        x.fee_paid_at ?? "",
      ];
    });
    const csv = [header, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `finanzas-${categoryId}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const fee = finance?.entry_fee_clp ?? 0;
  const collected = finance?.collected_clp ?? 0;
  const expected = finance?.expected_clp ?? 0;
  const paidCount = finance?.paid_count ?? 0;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-2xl border border-border bg-card p-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Cuota</p>
          <p className="font-display text-lg">{fmtCLP(fee)}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Recaudado</p>
          <p className="font-display text-lg">{fmtCLP(collected)}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Esperado</p>
          <p className="font-display text-lg">{fmtCLP(expected)}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Pagaron</p>
          <p className="font-display text-lg">
            {paidCount}/{confirmed.length}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Estado de pago por inscripción</p>
        <Button size="sm" variant="outline" onClick={exportCSV}>
          <Download className="mr-1 h-4 w-4" /> Exportar CSV
        </Button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full min-w-[480px] text-xs">
          <thead className="bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-2 py-2 text-left">Jugador</th>
              <th className="px-2 py-2 text-left">Pagado</th>
              <th className="px-2 py-2 text-left">Método</th>
              <th className="px-2 py-2 text-right">Monto</th>
            </tr>
          </thead>
          <tbody>
            {confirmed.map((r) => {
              const x = r as Registration & {
                fee_paid_at?: string | null;
                fee_amount_clp?: number | null;
                fee_method?: string | null;
              };
              const p1 = playerName(players.get(r.player1_user_id));
              const p2 = r.player2_user_id ? ` / ${playerName(players.get(r.player2_user_id))}` : "";
              const paid = !!x.fee_paid_at;
              const method = x.fee_method ?? "transferencia";
              return (
                <tr key={r.id} className="border-t border-border">
                  <td className="px-2 py-2">{p1}{p2}</td>
                  <td className="px-2 py-2">
                    <Switch
                      checked={paid}
                      disabled={busyId === r.id}
                      onCheckedChange={(v) => handleToggle(r.id, v, method)}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <Select
                      value={method}
                      disabled={!paid || busyId === r.id}
                      onValueChange={(v) => handleToggle(r.id, true, v)}
                    >
                      <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="transferencia">Transferencia</SelectItem>
                        <SelectItem value="efectivo">Efectivo</SelectItem>
                        <SelectItem value="exento">Exento</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-2 py-2 text-right font-mono">
                    {paid ? fmtCLP(x.fee_amount_clp ?? fee) : "—"}
                  </td>
                </tr>
              );
            })}
            {confirmed.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">
                  Sin inscritos confirmados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};