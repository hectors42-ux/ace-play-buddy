import { Link, useParams, Navigate } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { LandingPageShell } from "@/components/landing/LandingPageShell";
import { useRevealOnScroll } from "@/hooks/useRevealOnScroll";
import { LANDING_NEWS, getNewsBySlug, formatNewsDate } from "@/lib/landing-news-mock";

const NoticiaDetalle = () => {
  useRevealOnScroll();
  const { slug } = useParams<{ slug: string }>();
  const note = slug ? getNewsBySlug(slug) : undefined;

  if (!note) {
    return <Navigate to="/noticias" replace />;
  }

  // Próxima nota (simple navegación cíclica)
  const idx = LANDING_NEWS.findIndex((n) => n.slug === note.slug);
  const next = LANDING_NEWS[(idx + 1) % LANDING_NEWS.length];

  return (
    <LandingPageShell
      title={`${note.title} · Club de Tenis Providencia`}
      description={note.excerpt}
      canonicalPath={`/noticias/${note.slug}`}
    >
      <article>
        {/* HERO IMAGE */}
        <section className="relative bg-ink-dark">
          <img
            src={note.image}
            alt={note.title}
            width={1920}
            height={1080}
            className="h-[40vh] md:h-[55vh] w-full object-cover opacity-90"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink-dark/85 via-ink-dark/40 to-transparent" />
        </section>

        {/* CONTENT */}
        <section className="py-12 md:py-20">
          <div className="mx-auto max-w-3xl px-5 md:px-8">
            <Link
              to="/noticias"
              className="inline-flex items-center gap-2 text-sm text-ink-muted hover:text-primary mb-6 story-link"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Volver a noticias
            </Link>

            <p className="reveal label-eyebrow text-clay-deep mb-3">
              {note.category} · {formatNewsDate(note.date)}
            </p>
            <h1 className="reveal font-display text-3xl md:text-5xl font-semibold leading-[1.1] text-ink-dark">
              {note.title}
            </h1>
            <p className="reveal mt-5 text-lg md:text-xl text-ink-muted leading-relaxed">
              {note.excerpt}
            </p>

            <div className="court-line my-10 max-w-[120px]" />

            <div className="reveal space-y-5 text-ink-dark text-base md:text-lg leading-relaxed">
              {note.body.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </div>
        </section>

        {/* SIGUIENTE */}
        {next && next.slug !== note.slug && (
          <section className="bg-cream-1 border-t border-cream-2 py-12">
            <div className="mx-auto max-w-3xl px-5 md:px-8">
              <p className="label-eyebrow mb-3">Sigue leyendo</p>
              <Link
                to={`/noticias/${next.slug}`}
                className="group flex items-center justify-between gap-6 py-3"
              >
                <span className="font-display text-xl md:text-2xl text-ink-dark group-hover:text-primary transition-colors">
                  {next.title}
                </span>
                <ArrowRight className="h-5 w-5 shrink-0 text-primary transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </section>
        )}
      </article>
    </LandingPageShell>
  );
};

export default NoticiaDetalle;
