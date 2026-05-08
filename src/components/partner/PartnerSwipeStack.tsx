import { X, Info, Swords, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PartnerMatchCard } from "./PartnerMatchCard";
import type { PartnerSuggestion } from "@/hooks/usePartnerSuggestions";
import { useState } from "react";

interface Props {
  suggestions: PartnerSuggestion[];
  onInvite: (p: PartnerSuggestion) => void;
  onSkip: (p: PartnerSuggestion) => void;
  onInfo?: (p: PartnerSuggestion) => void;
  onBackToFilters: () => void;
}

/**
 * Stack visual sin drag — navegación por botones (espadas = invitar a competir, X = pasar).
 * Pensado para entrar completo en el viewport mobile.
 */
export const PartnerSwipeStack = ({
  suggestions,
  onInvite,
  onSkip,
  onInfo,
  onBackToFilters,
}: Props) => {
  const [index, setIndex] = useState(0);
  const current = suggestions[index];
  const next = suggestions[index + 1];

  const advance = (action: "invite" | "skip") => {
    if (!current) return;
    if (action === "invite") onInvite(current);
    else onSkip(current);
    setIndex((i) => i + 1);
  };

  if (!current) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {suggestions.length - index} compatibles hoy
        </p>
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onBackToFilters}>
          <SlidersHorizontal className="mr-1 h-3.5 w-3.5" />
          Filtros
        </Button>
      </div>

      <div className="relative mx-auto w-full max-w-md">
        {next && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-4 top-3 -z-10 origin-top scale-[0.94] opacity-50 blur-[1px]"
          >
            <PartnerMatchCard partner={next} />
          </div>
        )}
        <div className="relative">
          <PartnerMatchCard partner={current} />
        </div>
      </div>

      <div className="flex items-center justify-center gap-5 pt-1">
        <button
          type="button"
          onClick={() => advance("skip")}
          className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-card transition-smooth hover:border-destructive/40 hover:text-destructive active:scale-95"
          aria-label="Pasar"
        >
          <X className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => onInfo?.(current)}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-card transition-smooth hover:text-foreground active:scale-95"
          aria-label="Más info"
        >
          <Info className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => advance("invite")}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-smooth hover:bg-primary/90 active:scale-95"
          aria-label="Invitar a competir"
        >
          <Swords className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
};
