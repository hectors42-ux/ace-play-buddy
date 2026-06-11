import { useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PartnerPicker } from "@/components/PartnerPicker";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Category } from "@/hooks/useCategoryData";

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
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const motor = (category as { motor?: string } | null)?.motor;
  const isAmericanoRotacion = motor === "americano_rotacion";
  const isDoubles =
    !isAmericanoRotacion &&
    (category?.discipline === "tenis_dobles" || category?.discipline === "padel_dobles");

  if (!category) return null;

  const handleSubmit = async () => {
    if (isDoubles && !partnerId) {
      toast({ title: "Elige una pareja", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.rpc("register_to_category", {
      _category_id: category.id,
      _player2_user_id: isDoubles ? partnerId ?? undefined : undefined,
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
    setPartnerId(null);
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
              ? "Busca a tu pareja por nombre. Debe aceptar la invitación antes de que la inscripción quede pendiente de aprobación."
              : "El admin del torneo confirmará tu inscripción."}
          </DialogDescription>
        </DialogHeader>

        {isDoubles && (
          <div className="space-y-2 py-2">
            <Label>Pareja</Label>
            <PartnerPicker value={partnerId} onChange={(id) => setPartnerId(id)} />
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
