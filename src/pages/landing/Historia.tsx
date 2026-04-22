import { LandingPageShell } from "@/components/landing/LandingPageShell";
import { useRevealOnScroll } from "@/hooks/useRevealOnScroll";

interface TimelineItem {
  year: string;
  title: string;
  body: string;
}

const TIMELINE: TimelineItem[] = [
  {
    year: "1975",
    title: "Fundación del club",
    body:
      "El 10 de diciembre nace el Club de Tenis Providencia, en el marco de la visión municipal de transformar los terrenos del estadio en un centro deportivo recreativo. Se inaugura con cuatro canchas de arcilla y cincuenta socios.",
  },
  {
    year: "1982",
    title: "Primera ampliación",
    body:
      "Se construyen tres canchas adicionales y la primera sede social. El club empieza a recibir torneos zonales y consolida su academia infantil.",
  },
  {
    year: "1990",
    title: "Casa Club y piscina",
    body:
      "Se inaugura la casa club moderna con casino, salones sociales y la piscina exterior. El club se transforma en punto de encuentro para familias del sector.",
  },
  {
    year: "2003",
    title: "Canchas rápidas",
    body:
      "Se incorporan dos canchas rápidas para diversificar la oferta deportiva. La academia incorpora entrenamientos en superficie dura para jugadores competitivos.",
  },
  {
    year: "2015",
    title: "40 años",
    body:
      "El club celebra cuatro décadas con una temporada especial de torneos. Se publica un libro institucional con la historia y los protagonistas del club.",
  },
  {
    year: "2018",
    title: "Equipo Sudamericano ODASET",
    body:
      "Tres socias representan a Chile en el Sudamericano damas senior y obtienen el título continental. Marcelo Karakulja, Marta Ariztía y compañía son homenajeados.",
  },
  {
    year: "2024",
    title: "Sub-14 a Colombia",
    body:
      "Dos jugadores formados en la academia integran la selección Sub-14 que viaja al Sudamericano de Armenia, Colombia.",
  },
  {
    year: "2025",
    title: "Cincuenta años",
    body:
      "El club cumple medio siglo y abre una nueva etapa con plataforma digital propia, modernización de canchas y programas comunitarios de tenis inclusivo.",
  },
];

const Historia = () => {
  useRevealOnScroll();

  return (
    <LandingPageShell
      title="Historia · Club de Tenis Providencia"
      description="50 años de historia del Club de Tenis Providencia: desde la fundación en 1975 hasta hoy. Una línea de tiempo del tenis en Providencia."
      canonicalPath="/historia"
    >
      {/* HERO */}
      <section className="bg-cream-1 border-b border-cream-2 py-20 md:py-28">
        <div className="mx-auto max-w-5xl px-5 md:px-8">
          <p className="reveal label-eyebrow mb-4">Nuestra historia</p>
          <h1 className="reveal font-display text-4xl md:text-6xl font-semibold leading-[1.05] text-ink-dark">
            Cincuenta años de tenis<br />
            en Providencia.
          </h1>
          <p className="reveal mt-6 max-w-2xl text-base md:text-lg text-ink-muted leading-relaxed">
            De cuatro canchas y cincuenta socios en 1975 a una comunidad de más de
            ochocientos socios y nueve canchas activas. Una línea de tiempo del Club
            de Tenis Providencia.
          </p>
        </div>
      </section>

      {/* TIMELINE */}
      <section className="py-20 md:py-28">
        <div className="mx-auto max-w-3xl px-5 md:px-8">
          <ol className="relative border-l-2 border-cream-2 pl-8 md:pl-12 space-y-12">
            {TIMELINE.map((item) => (
              <li key={item.year} className="reveal relative">
                <span
                  aria-hidden
                  className="absolute -left-[42px] md:-left-[54px] top-1 h-3 w-3 rounded-full bg-primary ring-4 ring-cream-0"
                />
                <p className="font-display text-clay-deep text-3xl md:text-4xl font-semibold leading-none">
                  {item.year}
                </p>
                <h2 className="font-display text-xl md:text-2xl text-ink-dark mt-2 mb-3 leading-tight">
                  {item.title}
                </h2>
                <p className="text-ink-muted text-sm md:text-base leading-relaxed max-w-xl">
                  {item.body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </LandingPageShell>
  );
};

export default Historia;
