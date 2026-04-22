import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { LandingPageShell } from "@/components/landing/LandingPageShell";
import { useRevealOnScroll } from "@/hooks/useRevealOnScroll";
import { LANDING_NEWS, formatNewsDate } from "@/lib/landing-news-mock";

const Noticias = () => {
  useRevealOnScroll();

  return (
    <LandingPageShell
      title="Noticias · Club de Tenis Providencia"
      description="Últimas noticias, logros y actividades del Club de Tenis Providencia: academia, torneos, comunidad y vida del club."
      canonicalPath="/noticias"
    >
      <section className="bg-cream-1 border-b border-cream-2 py-16 md:py-24">
        <div className="mx-auto max-w-5xl px-5 md:px-8">
          <p className="reveal label-eyebrow mb-4">Noticias</p>
          <h1 className="reveal font-display text-4xl md:text-6xl font-semibold leading-[1.05] text-ink-dark">
            Lo que pasa<br />en el club.
          </h1>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {LANDING_NEWS.map((n) => (
              <Link to={`/noticias/${n.slug}`} key={n.slug} className="reveal group block">
                <article>
                  <div className="aspect-[16/10] overflow-hidden rounded-sm bg-cream-1 mb-4">
                    <img
                      src={n.image}
                      alt={n.title}
                      width={1280}
                      height={800}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  </div>
                  <p className="label-eyebrow text-clay-deep mb-2">
                    {n.category} · {formatNewsDate(n.date)}
                  </p>
                  <h2 className="font-display text-xl md:text-2xl text-ink-dark mb-2 leading-snug group-hover:text-primary transition-colors">
                    {n.title}
                  </h2>
                  <p className="text-sm text-ink-muted leading-relaxed mb-3">{n.excerpt}</p>
                  <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.15em] text-primary">
                    Leer nota <ArrowRight className="h-3 w-3" />
                  </span>
                </article>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </LandingPageShell>
  );
};

export default Noticias;
