import { X } from "lucide-react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { PlayerProfileCard } from "./PlayerProfileCard";
import type { RatingSport } from "@/lib/rating-utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string | null;
  sport?: RatingSport;
  onChallenge?: () => void;
  showChallengeButton?: boolean;
  contextHeader?: React.ReactNode;
}

export const PlayerProfileDrawer = ({
  open,
  onOpenChange,
  userId,
  sport,
  onChallenge,
  showChallengeButton,
  contextHeader,
}: Props) => {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <div className="mx-auto w-full max-w-md">
          <DrawerHeader className="text-left">
            <div className="flex items-start justify-between gap-2">
              <DrawerTitle className="font-display text-base">Perfil del jugador</DrawerTitle>
              <DrawerClose asChild>
                <button
                  type="button"
                  aria-label="Cerrar"
                  className="rounded-full border border-border bg-card p-1.5 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </DrawerClose>
            </div>
            {contextHeader}
          </DrawerHeader>
          <div className="max-h-[75vh] overflow-y-auto px-4 pb-6">
            {userId && (
              <PlayerProfileCard
                userId={userId}
                mode="public"
                sport={sport}
                onChallenge={
                  onChallenge
                    ? () => {
                        onOpenChange(false);
                        onChallenge();
                      }
                    : undefined
                }
                showChallengeButton={showChallengeButton}
              />
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
};
