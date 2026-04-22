import { LandingPageShell } from "@/components/landing/LandingPageShell";
import { LandingTeamGrid } from "@/components/landing/LandingTeamGrid";
import { useRevealOnScroll } from "@/hooks/useRevealOnScroll";

const STAFF_TECNICO = [
  { name: "Cristóbal Henríquez", role: "Profesor Jefe Academia" },
  { name: "Próximamente", role: "Coach Competitivo" },
  { name: "Próximamente", role: "Coach Formativo" },
  { name: "Próximamente", role: "Coach Escuelita" },
];

const STAFF_OPERACIONES = [
  { name: "María Teresa Olguín", role: "Jefa Contabilidad" },
  { name: "Adriana Barraza", role: "Secretaría Finanzas" },
  { name: "Próximamente", role: "Recepción" },
  { name: "Próximamente", role: "Mantenimiento canchas" },
];

const Equipo = () => {
  useRevealOnScroll();

  return (
    <LandingPageShell
      title="Equipo · Club de Tenis Providencia"
      description="Conoce al directorio, gerencia, equipo técnico y staff del Club de Tenis Providencia."
      canonicalPath="/equipo"
    >
      <section className="bg-cream-1 border-b border-cream-2 py-20 md:py-28">
        <div className="mx-auto max-w-5xl px-5 md:px-8">
          <p className="reveal label-eyebrow mb-4">Quiénes somos</p>
          <h1 className="reveal font-display text-4xl md:text-6xl font-semibold leading-[1.05] text-ink-dark">
            El equipo detrás<br />del club.
          </h1>
          <p className="reveal mt-6 max-w-2xl text-base md:text-lg text-ink-muted leading-relaxed">
            Directorio, gerencia, equipo técnico y staff operativo. Todos quienes
            hacen posible el Club de Tenis Providencia, día a día.
          </p>
        </div>
      </section>

      {/* DIRECTORIO */}
      <LandingTeamGrid eyebrow="Directorio y gerencia" title="Conducción del club." />

      {/* STAFF TÉCNICO */}
      <LandingTeamGrid
        eyebrow="Staff técnico"
        title="Equipo de la academia."
        directors={STAFF_TECNICO}
      />

      {/* STAFF OPERACIONES */}
      <section className="bg-cream-1 border-y border-cream-2 py-16 md:py-20">
        <div className="mx-auto max-w-5xl px-5 md:px-8">
          <p className="reveal label-eyebrow mb-3">Operaciones</p>
          <h2 className="reveal font-display text-3xl md:text-4xl font-semibold leading-[1.1] text-ink-dark mb-8">
            Equipo administrativo y de cancha.
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-3 gap-x-8 text-sm">
            {STAFF_OPERACIONES.map((p) => (
              <div
                key={p.name + p.role}
                className="reveal flex justify-between gap-4 border-b border-cream-2 pb-3"
              >
                <span className="text-ink-dark">{p.name}</span>
                <span className="text-ink-muted text-xs uppercase tracking-[0.15em]">{p.role}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </LandingPageShell>
  );
};

export default Equipo;
