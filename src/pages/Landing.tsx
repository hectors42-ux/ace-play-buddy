import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, Calendar, Trophy, Users, Waves, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LandingNav } from "@/components/landing/LandingNav";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { useRevealOnScroll } from "@/hooks/useRevealOnScroll";

import heroAerial from "@/assets/landing/hero-aerial.jpg";
import clubEditorial from "@/assets/landing/club-editorial.jpg";
import academyDark from "@/assets/landing/academy-dark.jpg";
import expReservar from "@/assets/landing/exp-reservar.jpg";
import expAcademia from "@/assets/landing/exp-academia.jpg";
import expTorneos from "@/assets/landing/exp-torneos.jpg";
import expSocial from "@/assets/landing/exp-social.jpg";
import newsSub14 from "@/assets/landing/news-sub14.jpg";
import newsOdaset from "@/assets/landing/news-odaset.jpg";
import newsClinica from "@/assets/landing/news-clinica.jpg";
import newsCopa from "@/assets/landing/news-copa.jpg";

const Landing = () => {
  useRevealOnScroll();

  // SEO + Schema.org en mount
  useEffect(() => {
    document.title = "Club de Tenis Providencia · 50 años de tenis en Santiago";
    const setMeta = (name: string, content: string, attr: "name" | "property" = "name") => {
      let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };
    const desc =
      "Club de tenis fundado en 1975 en Providencia, Santiago. 9 canchas, academia, piscina y una comunidad con tradición. Hazte socio.";
    setMeta("description", desc);
    setMeta("og:title", "Club de Tenis Providencia · 50 años en Santiago", "property");
    setMeta("og:description", desc, "property");
    setMeta("og:type", "website", "property");

    // Schema.org SportsClub
    const ldId = "ld-sportsclub";
    let ld = document.getElementById(ldId) as HTMLScriptElement | null;
    if (!ld) {
      ld = document.createElement("script");
      ld.id = ldId;
      ld.type = "application/ld+json";
      document.head.appendChild(ld);
    }
    ld.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "SportsClub",
      name: "Club de Tenis Providencia",
      foundingDate: "1975-12-10",
      url: "https://www.tenisclubprovidencia.cl",
      telephone: ["+56227064500", "+56232452549"],
      address: {
        "@type": "PostalAddress",
        streetAddress: "El Vergel 2855",
        addressLocality: "Providencia",
        addressRegion: "Región Metropolitana",
        addressCountry: "CL",
      },
      sport: "Tennis",
    });
  }, []);

  return (
    <div id="top" className="bg-cream-0 text-ink-dark overflow-x-hidden">
      <LandingNav />

      {/* ============= HERO ============= */}
      <section className="relative min-h-[100svh] w-full overflow-hidden flex items-end pt-32 pb-20 md:pt-40 md:pb-28">
        <img
          src={heroAerial}
          alt="Vista aérea de las canchas de arcilla del Club de Tenis Providencia"
          width={1920}
          height={1080}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-dark/95 via-ink-dark/75 to-ink-dark/55" />
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-r from-ink-dark/70 via-ink-dark/30 to-transparent" />

        <div className="relative z-10 mx-auto w-full max-w-7xl px-5 md:px-8">
          <div className="max-w-3xl [text-shadow:_0_2px_24px_rgb(0_0_0_/_45%)]">
            <p className="label-eyebrow text-cream-0 mb-5 inline-block bg-clay-deep px-3 py-1.5 rounded-sm">
              Fundado en 1975 · Providencia
            </p>
            <h1 className="font-display text-cream-0 font-semibold leading-[1.04] tracking-tight text-[clamp(2.25rem,5vw,4.5rem)]">
              Cincuenta años<br />
              de tenis en<br />
              el corazón de Providencia.
            </h1>
            <p className="mt-6 max-w-xl text-base md:text-lg text-cream-0 leading-relaxed">
              Nueve canchas. Una academia con jugadores en selección nacional.
              Una comunidad que se construye match a match desde 1975.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#socios">
                <Button variant="clay" size="lg">
                  Hazte socio <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </a>
              <a href="#club">
                <Button
                  size="lg"
                  variant="outline"
                  className="bg-transparent border-cream-0/40 text-cream-0 hover:bg-cream-0/10 hover:border-cream-0"
                >
                  Conoce el club
                </Button>
              </a>
            </div>
          </div>
        </div>

        <a
          href="#stats"
          className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2 hidden md:flex flex-col items-center gap-2 text-cream-0/70 hover:text-cream-0 transition-colors"
          aria-label="Bajar"
        >
          <div className="h-10 w-px bg-cream-0/40" />
          <ChevronDown className="h-4 w-4 animate-bounce" />
        </a>
      </section>

      {/* ============= STATS BAR ============= */}
      <section id="stats" className="bg-cream-1 border-y border-cream-2">
        <div className="mx-auto max-w-7xl px-5 md:px-8 py-12 md:py-16 grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-4">
          {[
            { num: "1975", label: "Año de fundación" },
            { num: "9", label: "Canchas", sub: "7 arcilla · 2 rápidas" },
            { num: "800+", label: "Socios activos" },
            { num: "50", label: "Años de historia" },
          ].map((s) => (
            <div key={s.label} className="reveal text-center md:text-left">
              <p className="font-display text-5xl md:text-6xl font-semibold text-clay-deep leading-none">
                {s.num}
              </p>
              <p className="mt-3 label-eyebrow text-ink-muted">{s.label}</p>
              {s.sub && <p className="mt-1 text-xs text-ink-soft">{s.sub}</p>}
            </div>
          ))}
        </div>
      </section>

      {/* ============= EL CLUB ============= */}
      <section id="club" className="py-20 md:py-32">
        <div className="mx-auto max-w-7xl px-5 md:px-8 grid md:grid-cols-12 gap-10 md:gap-16 items-center">
          <div className="reveal md:col-span-5">
            <div className="aspect-[4/5] overflow-hidden rounded-sm">
              <img
                src={clubEditorial}
                alt="Detalle de cancha de arcilla del club"
                width={1024}
                height={1280}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </div>
          </div>
          <div className="reveal md:col-span-7 md:pl-8">
            <p className="label-eyebrow mb-4">El Club</p>
            <h2 className="font-display text-4xl md:text-6xl font-semibold leading-[1.05] text-ink-dark">
              Una tradición construida<br />sobre arcilla.
            </h2>
            <div className="court-line my-8 max-w-[120px]" />
            <div className="space-y-5 text-ink-muted text-base md:text-lg leading-relaxed max-w-xl">
              <p>
                El Club de Tenis Providencia nace el 10 de diciembre de 1975 como parte
                de la visión municipal de transformar los terrenos del estadio en un complejo
                deportivo recreativo. Lo que comenzó con cuatro canchas y cincuenta socios inscritos,
                hoy es uno de los clubes de tenis con mayor tradición de Santiago.
              </p>
              <p>
                Nueve canchas — siete de arcilla y dos rápidas — una academia que ha formado
                jugadores que representan a Chile en torneos sudamericanos, y una comunidad de
                socios que mantiene viva la cultura del tenis en el corazón de Providencia.
              </p>
            </div>
            <a href="#experiencia" className="story-link mt-8 inline-flex items-center gap-2 text-primary font-medium">
              Saber más sobre el club <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>

      {/* ============= EXPERIENCIA — 4 CARDS ============= */}
      <section id="experiencia" className="bg-cream-1 py-20 md:py-32">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <div className="reveal max-w-2xl mb-14">
            <p className="label-eyebrow mb-4">Experiencia del socio</p>
            <h2 className="font-display text-4xl md:text-5xl font-semibold leading-[1.05] text-ink-dark">
              Todo lo que necesitas<br />para vivir el tenis.
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6 md:gap-8">
            {[
              { img: expReservar, label: "Reserva tus canchas", desc: "Sistema de reservas en línea las 24 horas. Programa con anticipación tus partidos preferidos.", cta: "Reservar ahora", href: "/reservar", icon: Calendar },
              { img: expAcademia, label: "Academia de tenis", desc: "Clases para todas las edades y niveles, desde escuelita infantil hasta entrenamiento competitivo.", cta: "Ver academia", href: "#academia", icon: Users },
              { img: expTorneos, label: "Torneos y campeonatos", desc: "Calendario anual de torneos internos. Copas tradicionales, ranking de socios y eventos especiales.", cta: "Próximos torneos", href: "/torneos", icon: Trophy },
              { img: expSocial, label: "Vida social", desc: "Piscina, casino, eventos sociales y un espacio de encuentro para socios y sus familias.", cta: "Cómo visitarnos", href: "#contacto", icon: Waves },
            ].map((c) => (
              <Card
                key={c.label}
                className="reveal group bg-cream-0 border-cream-2 overflow-hidden rounded-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-clay"
              >
                <div className="aspect-[16/10] overflow-hidden">
                  <img
                    src={c.img}
                    alt={c.label}
                    width={1280}
                    height={800}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                </div>
                <div className="p-7 md:p-8">
                  <div className="flex items-center gap-2 mb-3 label-eyebrow">
                    <c.icon className="h-3.5 w-3.5" />
                    {c.label}
                  </div>
                  <p className="text-ink-muted text-sm md:text-base leading-relaxed mb-5">
                    {c.desc}
                  </p>
                  <a href={c.href} className="story-link inline-flex items-center gap-1.5 text-primary text-sm font-medium">
                    {c.cta} <ArrowRight className="h-3.5 w-3.5" />
                  </a>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ============= ACADEMIA — DARK ============= */}
      <section id="academia" className="relative bg-ink-dark text-cream-1 overflow-hidden">
        <img
          src={academyDark}
          alt=""
          width={1920}
          height={1080}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover opacity-35"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-ink-dark via-ink-dark/85 to-transparent" />

        <div className="relative mx-auto max-w-7xl px-5 md:px-8 py-24 md:py-36">
          <div className="reveal max-w-2xl">
            <p className="label-eyebrow text-primary-glow mb-4">Academia de tenis</p>
            <h2 className="font-display text-4xl md:text-6xl font-semibold leading-[1.05] text-cream-0">
              Formamos a los jugadores<br />de mañana.
            </h2>
            <div className="court-line my-8 max-w-[120px] opacity-50" />
            <p className="text-cream-1/80 text-base md:text-lg leading-relaxed max-w-xl">
              Nuestra academia ha sido casa de entrenamiento de la selección chilena de damas
              senior ODASET — campeonas sudamericanas — y de jugadores juveniles que representan
              a Chile en torneos internacionales.
            </p>
          </div>

          <div className="reveal mt-14 grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-4xl">
            {[
              { title: "Programas", body: "Escuelita · Intermedio · Competitivo" },
              { title: "Jugadores", body: "Decenas formándose cada año" },
              { title: "Seleccionados", body: "Sub-14 en Sudamericano" },
            ].map((b) => (
              <div key={b.title} className="border-l border-cream-1/20 pl-5">
                <p className="label-eyebrow text-primary-glow mb-2">{b.title}</p>
                <p className="text-cream-0 text-sm md:text-base">{b.body}</p>
              </div>
            ))}
          </div>

          <a
            href="mailto:contacto@tenisclubprovidencia.cl?subject=Inscripci%C3%B3n%20Academia"
            className="reveal mt-12 inline-flex items-center gap-2 text-primary-glow story-link font-medium"
          >
            Inscríbete a la academia <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </section>

      {/* ============= NOTICIAS Y LOGROS ============= */}
      <section className="py-20 md:py-32">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <div className="reveal flex items-end justify-between flex-wrap gap-4 mb-12">
            <div>
              <p className="label-eyebrow mb-3">Noticias y logros</p>
              <h2 className="font-display text-4xl md:text-5xl font-semibold leading-[1.05] text-ink-dark">
                Lo que pasa en el club.
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { img: newsSub14, title: "Sub-14 representa a Chile", desc: "Samantha Álvarez y Miguel Vergara entrenaron en el club para el Sudamericano de Armenia, Colombia." },
              { img: newsOdaset, title: "Campeonas Sudamericanas", desc: "Marta Ariztía, Laura Donoso y Verónica Kohnenkamp ganan el torneo continental damas senior." },
              { img: newsClinica, title: "Clínica de tenis inclusivo", desc: "Junto a Alto Tenis y Fundación Abrazo de Gol, primera clínica para jóvenes con discapacidad intelectual." },
              { img: newsCopa, title: "Copa Milienko Karaciolo", desc: "Torneo interno tradicional con categorías singles y dobles, damas y varones." },
            ].map((n) => (
              <article key={n.title} className="reveal group">
                <div className="aspect-[16/10] overflow-hidden rounded-sm bg-cream-1 mb-4">
                  <img
                    src={n.img}
                    alt={n.title}
                    width={1280}
                    height={800}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                </div>
                <h3 className="font-display text-xl text-ink-dark mb-2 leading-snug">{n.title}</h3>
                <p className="text-sm text-ink-muted leading-relaxed mb-3">{n.desc}</p>
                <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.15em] text-ink-soft">
                  Próximamente
                </span>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ============= HAZTE SOCIO ============= */}
      <section id="socios" className="bg-cream-1 py-20 md:py-32">
        <div className="mx-auto max-w-7xl px-5 md:px-8 grid md:grid-cols-2 gap-12 md:gap-16">
          <div className="reveal">
            <p className="label-eyebrow mb-4">Membresía</p>
            <h2 className="font-display text-4xl md:text-6xl font-semibold leading-[1.05] text-ink-dark">
              Forma parte<br />del Club.
            </h2>
            <div className="court-line my-8 max-w-[120px]" />
            <p className="text-ink-muted text-base md:text-lg leading-relaxed mb-8 max-w-md">
              Únete a una comunidad de más de 800 socios que viven el tenis en el centro de
              Santiago. Acceso a las nueve canchas, academia, piscina, casino y todos los
              servicios del club.
            </p>
            <ul className="space-y-3 mb-10">
              {[
                "9 canchas (7 arcilla + 2 rápidas)",
                "Academia para todas las edades",
                "Piscina y casino",
                "Torneos internos durante todo el año",
              ].map((b) => (
                <li key={b} className="flex items-start gap-3 text-ink-dark">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                  {b}
                </li>
              ))}
            </ul>
            <a href="mailto:contacto@tenisclubprovidencia.cl?subject=Solicitud de incorporación">
              <Button variant="clay" size="xl">
                Solicitar incorporación <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </a>
          </div>

          <div className="reveal">
            <Card className="bg-cream-0 border-cream-3 rounded-sm p-7 md:p-10">
              <p className="label-eyebrow mb-6">Tarifas de incorporación</p>
              <Tabs defaultValue="vecinos">
                <TabsList className="bg-cream-1 mb-6 w-full">
                  <TabsTrigger value="vecinos" className="flex-1">Vecinos Providencia</TabsTrigger>
                  <TabsTrigger value="publico" className="flex-1">Público general</TabsTrigger>
                </TabsList>
                <TabsContent value="vecinos">
                  <FeeTable
                    rows={[
                      ["Individual", "20 UF"],
                      ["Familiar", "25 UF"],
                      ["Matrimonio", "23 UF"],
                      ["Adulto mayor matrimonio", "20 UF"],
                      ["Adulto mayor individual", "15 UF"],
                      ["Joven – Niño", "7,5 UF"],
                      ["Padre – Hijo(a)", "23 UF"],
                    ]}
                  />
                </TabsContent>
                <TabsContent value="publico">
                  <FeeTable
                    rows={[
                      ["Individual", "40 UF"],
                      ["Familiar", "50 UF"],
                      ["Matrimonio", "45 UF"],
                      ["Adulto mayor matrimonio", "25 UF"],
                      ["Adulto mayor individual", "30 UF"],
                      ["Joven – Niño", "15 UF"],
                      ["Padre – Hijo(a)", "45 UF"],
                    ]}
                  />
                </TabsContent>
              </Tabs>

              <div className="court-line my-7" />

              <p className="label-eyebrow mb-4">Mensualidades (CLP)</p>
              <FeeTable
                rows={[
                  ["Individual", "$63.950"],
                  ["Familiar", "$93.350"],
                  ["Matrimonio", "$81.450"],
                  ["Adulto mayor individual", "$46.850"],
                  ["Joven – Niño", "$34.500"],
                  ["Padre – Hijo(a)", "$81.450"],
                ]}
              />

              <p className="text-xs text-ink-soft leading-relaxed mt-7">
                Sujeto a disponibilidad. Requiere solicitud de incorporación, certificado de
                residencia (vecinos) y foto carnet.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* ============= EQUIPO ============= */}
      <section id="equipo" className="py-20 md:py-32">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <div className="reveal max-w-2xl mb-14">
            <p className="label-eyebrow mb-4">Nuestro equipo</p>
            <h2 className="font-display text-4xl md:text-5xl font-semibold leading-[1.05] text-ink-dark">
              Quienes hacen posible<br />el club, día a día.
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 mb-12">
            {[
              { name: "Marcelo Rojas F.", role: "Presidente" },
              { name: "Juan Eduardo Faúndez M.", role: "Director" },
              { name: "Carlos Solís H.", role: "Gerente" },
              { name: "María Teresa Olguín", role: "Jefa Contabilidad" },
            ].map((p) => (
              <div key={p.name} className="reveal">
                <div className="aspect-square bg-cream-1 rounded-sm mb-4 overflow-hidden flex items-end justify-center">
                  <span className="font-display text-7xl text-primary/30 pb-4 select-none">
                    {p.name.charAt(0)}
                  </span>
                </div>
                <p className="font-display text-base md:text-lg text-ink-dark leading-tight">{p.name}</p>
                <p className="label-eyebrow text-ink-muted mt-1">{p.role}</p>
              </div>
            ))}
          </div>

          <div className="reveal border-t border-cream-2 pt-8">
            <p className="label-eyebrow text-ink-muted mb-5">También parte del equipo</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-3 gap-x-8 text-sm">
              {[
                ["Guillermo Castillo A.", "Director"],
                ["Adriana Barraza", "Secretaría Finanzas"],
                ["Cristóbal Henríquez", "Profesor Jefe Academia"],
              ].map(([n, r]) => (
                <div key={n} className="flex justify-between gap-4 border-b border-cream-2 pb-3">
                  <span className="text-ink-dark">{n}</span>
                  <span className="text-ink-muted text-xs uppercase tracking-[0.15em]">{r}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============= PARTNERS ============= */}
      <section className="bg-cream-1 border-y border-cream-2 py-14 md:py-20">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <p className="reveal label-eyebrow text-center mb-10">Nuestros partners</p>
          <div className="reveal grid grid-cols-2 md:grid-cols-5 gap-6 md:gap-10 items-center">
            {["Municipalidad de Providencia", "Clínica MEDS", "Alto Tenis", "Pro Trainers", "Club Angostura"].map((p) => (
              <div
                key={p}
                className="h-16 md:h-20 flex items-center justify-center text-center font-display text-ink-soft text-sm md:text-base px-3 grayscale opacity-60 hover:opacity-100 hover:grayscale-0 hover:text-ink-dark transition-all"
              >
                {p}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============= CONTACTO ============= */}
      <section id="contacto" className="py-20 md:py-32">
        <div className="mx-auto max-w-7xl px-5 md:px-8 grid md:grid-cols-2 gap-10 md:gap-16">
          <div className="reveal aspect-[4/3] md:aspect-auto md:min-h-[420px] rounded-sm overflow-hidden bg-cream-1 border border-cream-2">
            <iframe
              title="Ubicación Club de Tenis Providencia"
              src="https://www.google.com/maps?q=El+Vergel+2855,+Providencia,+Santiago&output=embed"
              className="h-full w-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
          <div className="reveal flex flex-col justify-center">
            <p className="label-eyebrow mb-4">Visítanos</p>
            <h2 className="font-display text-4xl md:text-5xl font-semibold leading-[1.05] text-ink-dark mb-8">
              Estamos en el centro<br />de Providencia.
            </h2>

            <Card className="bg-cream-0 border-cream-2 rounded-sm p-7 md:p-8 space-y-6">
              <Field label="Dirección">
                El Vergel N° 2855<br />Providencia, Santiago
              </Field>
              <div className="court-line" />
              <Field label="Teléfonos">
                <a href="tel:+56227064500" className="story-link block">+56 2 2706 4500</a>
                <a href="tel:+56232452549" className="story-link block">+56 2 3245 2549</a>
              </Field>
              <div className="court-line" />
              <Field label="Horario">
                Lunes a Domingo<br />07:00 — 22:00
              </Field>

              <a
                href="https://www.google.com/maps/dir/?api=1&destination=El+Vergel+2855,+Providencia,+Santiago"
                target="_blank"
                rel="noopener noreferrer"
                className="block pt-2"
              >
                <Button variant="outline" size="lg" className="w-full">
                  Cómo llegar <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </a>
            </Card>
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
};

const FeeTable = ({ rows }: { rows: [string, string][] }) => (
  <div className="space-y-2.5">
    {rows.map(([label, value]) => (
      <div key={label} className="flex items-baseline justify-between gap-4 text-sm">
        <span className="text-ink-dark">{label}</span>
        <span className="flex-1 mx-3 border-b border-dotted border-cream-3" />
        <span className="font-display text-base font-semibold text-clay-deep">{value}</span>
      </div>
    ))}
  </div>
);

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <p className="label-eyebrow text-ink-muted mb-2">{label}</p>
    <div className="text-ink-dark text-base leading-relaxed">{children}</div>
  </div>
);

export default Landing;
