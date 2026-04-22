import g1 from "@/assets/landing/gallery-clay-sunset.jpg";
import g2 from "@/assets/landing/gallery-racket.jpg";
import g3 from "@/assets/landing/gallery-kids-academy.jpg";
import g4 from "@/assets/landing/gallery-clubhouse.jpg";
import g5 from "@/assets/landing/gallery-line.jpg";
import g6 from "@/assets/landing/gallery-pool.jpg";

const PHOTOS = [
  { src: g1, alt: "Cancha de arcilla al atardecer", w: 1280, h: 1600, span: "row-span-2", caption: "Cancha 3 · Atardecer, 2024" },
  { src: g3, alt: "Niños en clases de la academia", w: 1280, h: 960, span: "", caption: "Academia infantil · 2023" },
  { src: g2, alt: "Detalle de raqueta de madera encordada", w: 1280, h: 960, span: "", caption: "Archivo · Raqueta clásica" },
  { src: g4, alt: "Terraza de la casa club al anochecer", w: 1280, h: 1600, span: "row-span-2", caption: "Casa club · Invierno" },
  { src: g5, alt: "Línea de cancha siendo barrida", w: 1280, h: 960, span: "", caption: "Mantenimiento · Línea blanca" },
  { src: g6, alt: "Piscina del club en verano", w: 1280, h: 960, span: "", caption: "Piscina · Verano 2024" },
];

export const LandingGallery = () => {
  return (
    <section id="galeria" className="py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <div className="reveal max-w-2xl mb-12">
          <p className="label-eyebrow mb-4">Galería</p>
          <h2 className="font-display text-4xl md:text-5xl font-semibold leading-[1.05] text-ink-dark">
            El club en imágenes.
          </h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 auto-rows-[140px] sm:auto-rows-[180px] md:auto-rows-[200px] gap-3 md:gap-4">
          {PHOTOS.map((p) => (
            <figure
              key={p.alt}
              className={`reveal relative overflow-hidden rounded-sm bg-cream-1 group ${p.span}`}
            >
              <img
                src={p.src}
                alt={p.alt}
                width={p.w}
                height={p.h}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
              />
              <figcaption className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 px-3 py-2 bg-gradient-to-t from-ink-dark/80 to-transparent">
                <span className="text-[10px] uppercase tracking-[0.2em] text-cream-0 font-medium">
                  {p.caption}
                </span>
                <span className="text-[9px] uppercase tracking-[0.2em] text-cream-0/60 hidden sm:inline">
                  ◦ CTP
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
        <p className="reveal mt-4 text-xs text-ink-soft text-center md:text-right">
          Imágenes referenciales generadas para previsualización.
        </p>
      </div>
    </section>
  );
};
