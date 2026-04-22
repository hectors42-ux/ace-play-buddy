interface TeamMember {
  name: string;
  role: string;
}

interface LandingTeamGridProps {
  directors?: TeamMember[];
  staff?: TeamMember[];
  title?: string;
  eyebrow?: string;
}

const DEFAULT_DIRECTORS: TeamMember[] = [
  { name: "Marcelo Rojas F.", role: "Presidente" },
  { name: "Juan Eduardo Faúndez M.", role: "Director" },
  { name: "Guillermo Castillo A.", role: "Director" },
  { name: "Carlos Solís H.", role: "Gerente" },
  { name: "María Teresa Olguín", role: "Jefa Contabilidad" },
  { name: "Adriana Barraza", role: "Secretaría Finanzas" },
  { name: "Cristóbal Henríquez", role: "Profesor Jefe Academia" },
  { name: "Próximamente", role: "Vicepresidencia" },
];

export const LandingTeamGrid = ({
  directors = DEFAULT_DIRECTORS,
  title = "Quienes hacen posible el club, día a día.",
  eyebrow = "Nuestro equipo",
}: LandingTeamGridProps) => {
  return (
    <section id="equipo" className="py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <div className="reveal max-w-2xl mb-14">
          <p className="label-eyebrow mb-4">{eyebrow}</p>
          <h2 className="font-display text-4xl md:text-5xl font-semibold leading-[1.05] text-ink-dark">
            {title}
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          {directors.map((p) => (
            <div key={p.name + p.role} className="reveal">
              <div
                aria-hidden
                className="aspect-square bg-cream-1 rounded-sm mb-4 overflow-hidden flex items-end justify-center relative"
              >
                <div className="absolute inset-0 bg-gradient-to-b from-cream-1 to-cream-2/60" />
                <span className="relative font-display text-7xl text-primary/30 pb-4 select-none">
                  {p.name.charAt(0)}
                </span>
              </div>
              <p className="font-display text-base md:text-lg text-ink-dark leading-tight">{p.name}</p>
              <p className="label-eyebrow text-ink-muted mt-1">{p.role}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
