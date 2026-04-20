import { CalendarPlus, Users, Trophy, GraduationCap } from "lucide-react";
import { Link } from "react-router-dom";

const actions = [
  {
    id: "reservar",
    label: "Reservar cancha",
    description: "Elige tu horario",
    icon: CalendarPlus,
    tone: "clay" as const,
    to: "/reservar",
  },
  {
    id: "partner",
    label: "Buscar partner",
    description: "Rivales sugeridos",
    icon: Users,
    tone: "court" as const,
    to: "/ranking?tab=piramide&filter=retables",
  },
  {
    id: "clase",
    label: "Tomar clase",
    description: "Con tu coach",
    icon: GraduationCap,
    tone: "court" as const,
    to: "/clases",
  },
  {
    id: "torneo",
    label: "Torneos",
    description: "Inscríbete y juega",
    icon: Trophy,
    tone: "court" as const,
    to: "/torneos",
  },
];

const toneClass: Record<(typeof actions)[number]["tone"], string> = {
  clay: "bg-gradient-clay text-primary-foreground shadow-clay",
  court: "bg-gradient-court text-accent-foreground shadow-soft",
};

const iconToneClass: Record<(typeof actions)[number]["tone"], string> = {
  clay: "bg-white/20 text-primary-foreground",
  court: "bg-white/15 text-accent-foreground",
};

export const QuickActions = () => {
  return (
    <section aria-labelledby="acciones-titulo" className="px-5">
      <h2
        id="acciones-titulo"
        className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground"
      >
        ¿Qué quieres hacer hoy?
      </h2>
      <div className="grid grid-cols-2 gap-3">
        {actions.map((action, i) => {
          const Icon = action.icon;
          const inner = (
            <>
              <span
                className={`flex h-11 w-11 items-center justify-center rounded-2xl ${iconToneClass[action.tone]}`}
              >
                <Icon className="h-5 w-5" strokeWidth={2.2} />
              </span>
              <div>
                <p className="font-display text-base font-semibold leading-tight">
                  {action.label}
                </p>
                <p className="mt-1 text-xs opacity-80">{action.description}</p>
              </div>
            </>
          );
          const className = `group flex animate-fade-in-up flex-col items-start gap-3 rounded-3xl p-4 text-left transition-smooth ${
            action.to ? "hover:-translate-y-0.5" : "opacity-70 cursor-not-allowed"
          } ${toneClass[action.tone]}`;
          return action.to ? (
            <Link
              key={action.id}
              to={action.to}
              style={{ animationDelay: `${i * 60}ms` }}
              className={className}
            >
              {inner}
            </Link>
          ) : (
            <div
              key={action.id}
              style={{ animationDelay: `${i * 60}ms` }}
              className={className}
              aria-disabled
            >
              {inner}
            </div>
          );
        })}
      </div>
    </section>
  );
};
