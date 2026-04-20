import { useEffect, useState } from "react";
import {
  Calendar,
  Trophy,
  Swords,
  GraduationCap,
  TrendingUp,
  Sparkles,
  ChevronRight,
  X,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const TOUR_STORAGE_KEY = "aceplay-welcome-tour-seen-v1";

interface TourStep {
  icon: typeof Calendar;
  title: string;
  description: string;
  accent: string;
}

const STEPS: TourStep[] = [
  {
    icon: Sparkles,
    title: "¡Bienvenido a AcePlay!",
    description:
      "Tu cancha, tu nivel y tu club, en un solo lugar. Te mostramos lo esencial en 30 segundos.",
    accent: "from-primary to-primary-glow",
  },
  {
    icon: Calendar,
    title: "Reserva tu cancha",
    description:
      "Elige día, horario y compañero. Reservas confirmadas en segundos, sin llamadas.",
    accent: "from-primary to-primary-deep",
  },
  {
    icon: Trophy,
    title: "Torneos del club",
    description:
      "Inscríbete, sigue tu cuadro en vivo y agenda tus partidos directo desde la app.",
    accent: "from-primary-glow to-primary",
  },
  {
    icon: Swords,
    title: "Pirámide & desafíos",
    description:
      "Reta a otros socios, sube de posición y compite por el ranking interno del club.",
    accent: "from-accent to-primary",
  },
  {
    icon: GraduationCap,
    title: "Clases con tu coach",
    description:
      "Reserva clases individuales o compartidas con los entrenadores oficiales.",
    accent: "from-primary-deep to-primary",
  },
  {
    icon: TrendingUp,
    title: "Tu nivel evoluciona",
    description:
      "Cada partido cuenta. Mira tu rating, categoría y logros desde tu perfil.",
    accent: "from-primary to-accent",
  },
];

export const WelcomeTour = ({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const [step, setStep] = useState(0);
  const total = STEPS.length;

  // Reset cuando se reabre
  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  const handleClose = () => {
    try {
      localStorage.setItem(TOUR_STORAGE_KEY, "1");
    } catch {
      // ignore
    }
    onOpenChange(false);
  };

  const next = () => {
    if (step < total - 1) setStep((s) => s + 1);
    else handleClose();
  };

  const current = STEPS[step];
  const Icon = current.icon;
  const isLast = step === total - 1;

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? onOpenChange(v) : handleClose())}>
      <DialogContent
        className="max-w-sm gap-0 overflow-hidden rounded-3xl border-0 p-0 shadow-elevated [&>button]:hidden"
      >
        <DialogTitle className="sr-only">{current.title}</DialogTitle>
        <DialogDescription className="sr-only">{current.description}</DialogDescription>

        {/* Botón cerrar */}
        <button
          type="button"
          onClick={handleClose}
          aria-label="Cerrar tour"
          className="absolute right-3 top-3 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-background/80 text-muted-foreground backdrop-blur transition-smooth hover:bg-background hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header con icono animado */}
        <div
          key={step}
          className={cn(
            "relative flex h-44 items-center justify-center overflow-hidden bg-gradient-to-br",
            current.accent,
          )}
        >
          {/* Círculos decorativos animados */}
          <div className="absolute -left-6 -top-6 h-24 w-24 rounded-full bg-white/15 blur-xl animate-pulse" />
          <div
            className="absolute -bottom-8 -right-4 h-28 w-28 rounded-full bg-white/10 blur-2xl animate-pulse"
            style={{ animationDelay: "0.4s" }}
          />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.18),transparent_60%)]" />

          {/* Icono */}
          <div
            key={`icon-${step}`}
            className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-white/20 backdrop-blur-md shadow-clay animate-scale-in"
          >
            <Icon className="h-10 w-10 text-white drop-shadow-md" strokeWidth={2} />
          </div>
        </div>

        {/* Contenido */}
        <div className="space-y-5 bg-card px-6 pb-6 pt-5">
          <div key={`text-${step}`} className="space-y-2 animate-fade-in text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
              {step + 1} / {total}
            </p>
            <h3 className="font-display text-xl font-semibold leading-tight text-foreground">
              {current.title}
            </h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {current.description}
            </p>
          </div>

          {/* Indicadores */}
          <div className="flex items-center justify-center gap-1.5">
            {STEPS.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setStep(i)}
                aria-label={`Ir al paso ${i + 1}`}
                className={cn(
                  "h-1.5 rounded-full transition-smooth",
                  i === step
                    ? "w-6 bg-primary"
                    : i < step
                      ? "w-1.5 bg-primary/60"
                      : "w-1.5 bg-muted",
                )}
              />
            ))}
          </div>

          {/* Acciones */}
          <div className="flex items-center gap-2">
            {!isLast && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="flex-1"
              >
                Saltar
              </Button>
            )}
            <Button
              variant="clay"
              size="default"
              onClick={next}
              className={cn("gap-1", isLast ? "w-full" : "flex-1")}
            >
              {isLast ? "Comenzar a jugar" : "Siguiente"}
              {!isLast && <ChevronRight className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const hasSeenWelcomeTour = (): boolean => {
  try {
    return localStorage.getItem(TOUR_STORAGE_KEY) === "1";
  } catch {
    return true;
  }
};

export const resetWelcomeTour = () => {
  try {
    localStorage.removeItem(TOUR_STORAGE_KEY);
  } catch {
    // ignore
  }
};
