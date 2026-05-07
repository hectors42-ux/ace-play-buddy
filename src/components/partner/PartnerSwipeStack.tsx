import { useState } from "react";
import { motion, useMotionValue, useTransform, AnimatePresence, type PanInfo } from "framer-motion";
import { X, Info, Heart, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PartnerMatchCard } from "./PartnerMatchCard";
import type { PartnerSuggestion } from "@/hooks/usePartnerSuggestions";

interface Props {
  suggestions: PartnerSuggestion[];
  onInvite: (p: PartnerSuggestion) => void;
  onSkip: (p: PartnerSuggestion) => void;
  onInfo?: (p: PartnerSuggestion) => void;
  onBackToFilters: () => void;
}

const SWIPE_THRESHOLD = 110;

const SwipeCard = ({
  partner,
  onInvite,
  onSkip,
  onInfo,
  isTop,
  index,
}: {
  partner: PartnerSuggestion;
  onInvite: () => void;
  onSkip: () => void;
  onInfo?: () => void;
  isTop: boolean;
  index: number;
}) => {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 0, 200], [-12, 0, 12]);
  const likeOpacity = useTransform(x, [40, 140], [0, 1]);
  const nopeOpacity = useTransform(x, [-140, -40], [1, 0]);

  const handleEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x > SWIPE_THRESHOLD) onInvite();
    else if (info.offset.x < -SWIPE_THRESHOLD) onSkip();
  };

  return (
    <motion.div
      drag={isTop ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.6}
      onDragEnd={handleEnd}
      style={{ x, rotate, zIndex: 10 - index }}
      initial={{ scale: isTop ? 1 : 0.94, y: index * 8, opacity: index < 3 ? 1 : 0 }}
      animate={{ scale: isTop ? 1 : 0.94, y: index * 8 }}
      exit={{ x: x.get() > 0 ? 600 : -600, opacity: 0, transition: { duration: 0.25 } }}
      className="absolute inset-x-0 top-0 cursor-grab active:cursor-grabbing"
    >
      <div className="relative">
        <PartnerMatchCard partner={partner} />
        {isTop && (
          <>
            <motion.div
              style={{ opacity: likeOpacity }}
              className="pointer-events-none absolute left-6 top-6 -rotate-12 rounded-lg border-2 border-success bg-success/20 px-3 py-1 font-display text-lg font-bold text-success"
            >
              INVITAR
            </motion.div>
            <motion.div
              style={{ opacity: nopeOpacity }}
              className="pointer-events-none absolute right-6 top-6 rotate-12 rounded-lg border-2 border-destructive bg-destructive/20 px-3 py-1 font-display text-lg font-bold text-destructive"
            >
              PASAR
            </motion.div>
          </>
        )}
      </div>
    </motion.div>
  );
};

export const PartnerSwipeStack = ({
  suggestions,
  onInvite,
  onSkip,
  onInfo,
  onBackToFilters,
}: Props) => {
  const [index, setIndex] = useState(0);
  const visible = suggestions.slice(index, index + 3);
  const current = suggestions[index];

  const advance = (action: "invite" | "skip") => {
    if (!current) return;
    if (action === "invite") onInvite(current);
    else onSkip(current);
    setIndex((i) => i + 1);
  };

  if (!current) {
    return null; // empty handled by parent
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {suggestions.length - index} compatibles hoy
        </p>
        <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={onBackToFilters}>
          <SlidersHorizontal className="mr-1 h-3.5 w-3.5" />
          Filtros
        </Button>
      </div>

      <div className="relative mx-auto h-[520px] w-full max-w-md">
        <AnimatePresence>
          {visible
            .map((p, i) => (
              <SwipeCard
                key={p.user_id}
                partner={p}
                isTop={i === 0}
                index={i}
                onInvite={() => advance("invite")}
                onSkip={() => advance("skip")}
                onInfo={onInfo ? () => onInfo(p) : undefined}
              />
            ))
            .reverse()}
        </AnimatePresence>
      </div>

      {/* Botones flotantes */}
      <div className="flex items-center justify-center gap-5 pt-2">
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
          aria-label="Invitar"
        >
          <Heart className="h-6 w-6 fill-current" />
        </button>
      </div>
    </div>
  );
};
