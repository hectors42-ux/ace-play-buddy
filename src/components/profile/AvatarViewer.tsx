import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string | null;
  name: string;
  initials: string;
}

/**
 * Visor de avatar a tamaño grande sin pérdida de calidad.
 * - Para imágenes remotas (DiceBear, etc.) intenta solicitar 512px.
 * - Conserva proporción cuadrada y diseño en línea con la app.
 */
export const AvatarViewer = ({ open, onOpenChange, url, name, initials }: Props) => {
  // Si la URL viene de DiceBear con size=NN, lo subimos a 512 para verlo nítido.
  const hiResUrl = url
    ? url.includes("api.dicebear.com")
      ? url.replace(/size=\d+/, "size=512")
      : url
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm border-border bg-card p-0 sm:rounded-3xl">
        <div className="overflow-hidden rounded-t-3xl bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-6">
          <div className="mx-auto aspect-square w-full max-w-[280px] overflow-hidden rounded-2xl border border-border bg-background shadow-elevated">
            {hiResUrl ? (
              <img
                src={hiResUrl}
                alt={name}
                className="h-full w-full object-cover"
                loading="eager"
              />
            ) : (
              <Avatar className="h-full w-full rounded-none">
                <AvatarFallback className="rounded-none text-5xl font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
            )}
          </div>
          <p className="mt-4 text-center font-display text-base font-semibold text-foreground">
            {name}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
