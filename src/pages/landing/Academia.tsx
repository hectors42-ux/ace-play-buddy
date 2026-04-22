import { ArrowRight, Check, Mail } from "lucide-react";
import { LandingPageShell } from "@/components/landing/LandingPageShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useRevealOnScroll } from "@/hooks/useRevealOnScroll";
import academyDark from "@/assets/landing/academy-dark.jpg";

interface Plan {
  name: string;
  ages: string;
  freq: string;
  desc: string;
  bullets: string[];
  highlight?: boolean;
}

const PLANS: Plan[] = [
  {
    name: "Escuelita",
    ages: "5 – 8 años",
    freq: "1 a 2 veces por semana",
    desc: "Iniciación al tenis con foco en motricidad, coordinación y juego.",
    bullets: ["Mini-tenis con material adaptado", "Grupos pequeños", "Orientado al juego y diversión"],
  },
  {
    name: "Formativo",
    ages: "9 – 14 años",
    freq: "2 a 3 veces por semana",
    desc: "Desarrollo técnico y táctico, con introducción a competencia.",
    bullets: ["Técnica de fondo y red", "Preparación física básica", "Torneos internos"],
    highlight: true,
  },
  {
    name: "Competitivo",
    ages: "12+ años",
    freq: "3 a 5 veces por semana",
    desc: "Entrenamiento integral para jugadores con proyección de torneos federados.",
    bullets: ["Plan táctico individual", "Preparación física específica", "Apoyo a viajes y torneos"],
  },
  {
    name: "Adultos",
    ages: "Desde 16 años",
    freq: "Flexible",
    desc: "Clases grupales o individuales para todos los niveles, desde inicio hasta avanzado.",
    bullets: ["Niveles divididos por NTRP", "Cardio-tenis disponible", "Sparrings programados"],
  },
];

const Academia = () => {
  useRevealOnScroll();

  return (
    <LandingPageShell
      title="Academia · Club de Tenis Providencia"
      description="Academia de tenis para todas las edades en Providencia: escuelita, formativo, competitivo y adultos. Inscripciones abiertas todo el año."
      canonicalPath="/academia"
    >
      {/* HERO */}
      <section className="relative bg-ink-dark text-cream-1 overflow-hidden">
        <img
          src={academyDark}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-ink-dark via-ink-dark/85 to-transparent" />
        <div className="relative mx-auto max-w-5xl px-5 md:px-8 py-20 md:py-32">
          <p className="reveal label-eyebrow text-primary-glow mb-4">Academia de tenis</p>
          <h1 className="reveal font-display text-4xl md:text-6xl font-semibold leading-[1.05] text-cream-0">
            Formamos a los jugadores<br />de mañana.
          </h1>
          <p className="reveal mt-6 max-w-2xl text-base md:text-lg text-cream-1/85 leading-relaxed">
            Programas para todas las edades y niveles, desde la escuelita infantil
            hasta el entrenamiento competitivo. Profesores certificados, planes
            individualizados y una comunidad que respira tenis desde 1975.
          </p>
        </div>
      </section>

      {/* PLANES */}
      <section className="py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <div className="reveal max-w-2xl mb-14">
            <p className="label-eyebrow mb-3">Planes</p>
            <h2 className="font-display text-3xl md:text-5xl font-semibold leading-[1.05] text-ink-dark">
              Un plan para cada etapa.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            {PLANS.map((p) => (
              <Card
                key={p.name}
                className={`reveal rounded-sm border-cream-2 p-7 md:p-9 ${
                  p.highlight ? "bg-cream-1 ring-1 ring-primary/30 shadow-soft" : "bg-cream-0"
                }`}
              >
                <div className="flex items-baseline justify-between mb-4">
                  <h3 className="font-display text-2xl md:text-3xl text-ink-dark">{p.name}</h3>
                  {p.highlight && (
                    <span className="label-eyebrow bg-primary/10 text-primary px-2 py-1 rounded-sm">
                      Más elegido
                    </span>
                  )}
                </div>
                <p className="text-ink-muted text-sm mb-1">{p.ages}</p>
                <p className="label-eyebrow text-ink-muted mb-5">{p.freq}</p>
                <p className="text-ink-dark text-sm md:text-base leading-relaxed mb-5">{p.desc}</p>
                <ul className="space-y-2.5">
                  {p.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2.5 text-sm text-ink-dark">
                      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                        <Check className="h-2.5 w-2.5" strokeWidth={3} />
                      </span>
                      {b}
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* HORARIOS */}
      <section className="bg-cream-1 border-y border-cream-2 py-16 md:py-20">
        <div className="mx-auto max-w-5xl px-5 md:px-8">
          <p className="reveal label-eyebrow mb-3">Horarios</p>
          <h2 className="reveal font-display text-3xl md:text-4xl font-semibold leading-[1.1] text-ink-dark mb-8">
            Bloques disponibles.
          </h2>
          <div className="reveal grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
            {[
              { label: "Lunes a Viernes", body: "08:00 — 12:00 · 16:00 — 21:00" },
              { label: "Sábados", body: "09:00 — 13:00 · 15:00 — 19:00" },
              { label: "Domingos", body: "Bajo demanda" },
            ].map((b) => (
              <div key={b.label} className="bg-cream-0 rounded-sm border border-cream-2 p-5">
                <p className="label-eyebrow text-clay-deep mb-2">{b.label}</p>
                <p className="text-ink-dark">{b.body}</p>
              </div>
            ))}
          </div>
          <p className="reveal text-xs text-ink-soft mt-4">
            Los bloques específicos por plan se confirman en el momento de la inscripción.
          </p>
        </div>
      </section>

      {/* CTA INSCRIPCIÓN */}
      <section className="py-20 md:py-28">
        <div className="mx-auto max-w-3xl px-5 md:px-8 text-center">
          <p className="reveal label-eyebrow mb-3">Inscripciones</p>
          <h2 className="reveal font-display text-3xl md:text-5xl font-semibold leading-[1.05] text-ink-dark mb-5">
            ¿Listo para inscribirte?
          </h2>
          <p className="reveal text-ink-muted text-base md:text-lg leading-relaxed mb-8">
            Escríbenos a la dirección de la academia con tu nombre, edad del jugador
            y plan de interés. Te respondemos dentro de 24 horas hábiles.
          </p>
          <a
            href="mailto:academia@tenisclubprovidencia.cl?subject=Inscripci%C3%B3n%20Academia&body=Hola%2C%20quiero%20inscribirme%20en%20la%20academia.%0A%0ANombre%20del%20jugador%3A%20%0AEdad%3A%20%0APlan%20de%20inter%C3%A9s%3A%20%0ADisponibilidad%20horaria%3A%20%0ATel%C3%A9fono%20de%20contacto%3A%20%0A%0AGracias."
            className="reveal inline-block"
          >
            <Button variant="clay" size="xl">
              <Mail className="h-4 w-4" /> Enviar inscripción <ArrowRight className="h-4 w-4" />
            </Button>
          </a>
          <p className="reveal mt-4 text-xs text-ink-soft">
            academia@tenisclubprovidencia.cl · +56 2 2706 4500
          </p>
        </div>
      </section>
    </LandingPageShell>
  );
};

export default Academia;
