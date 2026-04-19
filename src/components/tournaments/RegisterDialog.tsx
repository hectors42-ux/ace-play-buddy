import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Category, Player, playerName } from "@/hooks/useCategoryData";

interface RegisterDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  category: Category | null;
  onRegistered: () => void;
}

export const RegisterDialog = ({
  open,
  onOpenChange,
  category,
  onRegistered,
}: RegisterDialogProps) => {
  const { profile } = useAuth();
  const [partners, setPartners] = useState<Player[]>([]);
  const [partnerId, setPartnerId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [loadingPartners, setLoadingPartners] = useState(false);

  const isDoubles = category?.discipline === "tenis_dobles";

  useEffect(() => {
    if (!open || !isDoubles || !profile) return;
    setLoadingPartners(true);
    supabase
      .from("profiles")
      .select("user_id, first_name, last_name, ntrp_level, club_ranking")
      .eq("tenant_id", profile.tenant_id)
      .neq("user_id", profile.user_id)
      .order("first_name")
      .then(({ data }) => {
        setPartners((data ?? []) as Player[]);
        setLoadingPartners(false);
      });
  }, [open, isDoubles, profile]);

  if (!category) return null;

  const handleSubmit = async () => {
    if (isDoubles && !partnerId) {
      toast({ title: "Elige una pareja", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.rpc("register_to_category", {
      _category_id: category.id,
      _player2_user_id: isDoubles ? partnerId : undefined,
    });
    setSubmitting(false);
    if (error) {
      toast({ title: "No se pudo inscribir", description: error.message, variant: "destructive" });
      return;
    }
    toast({
      title: isDoubles ? "Invitación enviada a tu pareja" : "Inscripción enviada",
      description: isDoubles
        ? "Quedará confirmada cuando tu pareja acepte y el admin apruebe."
        : "El admin revisará tu inscripción.",
    });
    setPartnerId("");
    onOpenChange(false);
    onRegistered();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Inscribirse · {category.name}</DialogTitle>
          <DialogDescription>
            {isDoubles
              ? "Elige a tu pareja. Debe aceptar la invitación antes de que la inscripción quede pendiente de aprobación."
              : "El admin del torneo confirmará tu inscripción."}
          </DialogDescription>
        </DialogHeader>

        {isDoubles && (
          <div className="py-2">
            <Label>Pareja</Label>
            <Select value={partnerId} onValueChange={setPartnerId} disabled={loadingPartners}>
              <SelectTrigger>
                <SelectValue placeholder={loadingPartners ? "Cargando socios…" : "Elige un socio"} />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {partners.map((p) => (
                  <SelectItem key={p.user_id} value={p.user_id}>
                    {playerName(p)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Inscribirme
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
