import providenciaLogo from "@/assets/partners/providencia.png";
import medsLogo from "@/assets/partners/meds.png";
import altoTenisLogo from "@/assets/partners/alto-tenis.png";
import proTrainerLogo from "@/assets/partners/pro-trainer.png";
import angosturaLogo from "@/assets/partners/angostura.png";

export interface PartnerItem {
  name: string;
  logo?: string;
  url: string;
  /** Texto visible cuando no hay logo (o como aria-label) */
  label?: string;
}

export const PARTNERS: PartnerItem[] = [
  {
    name: "Municipalidad de Providencia",
    logo: providenciaLogo,
    url: "https://www.providencia.cl",
  },
  {
    name: "Clínica MEDS",
    logo: medsLogo,
    url: "https://www.meds.cl",
  },
  {
    name: "Alto Tenis",
    logo: altoTenisLogo,
    url: "https://altotenis.cl",
  },
  {
    name: "Pro Trainer",
    logo: proTrainerLogo,
    url: "https://www.protraining.cl",
  },
  {
    name: "Angostura Country Club",
    logo: angosturaLogo,
    url: "https://www.clubdegolfangostura.cl",
  },
  {
    name: "Talabarterías Chilenas",
    url: "https://talabarteriaschilenas.cl",
  },
];

interface LandingPartnersProps {
  partners?: PartnerItem[];
}

export const LandingPartners = ({ partners = PARTNERS }: LandingPartnersProps) => {
  return (
    <section className="bg-cream-1 border-y border-cream-2 py-14 md:py-20">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <p className="reveal label-eyebrow text-center mb-10">Nuestros partners</p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 md:gap-10 items-center">
          {partners.map((p) => (
            <a
              key={p.name}
              href={p.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Visitar sitio web de ${p.name}`}
              className="reveal group h-20 flex items-center justify-center text-center px-3 outline-none focus-visible:ring-2 focus-visible:ring-primary/60 rounded-sm"
            >
              {p.logo ? (
                <img
                  src={p.logo}
                  alt={p.name}
                  loading="lazy"
                  width={140}
                  height={75}
                  className="max-h-14 w-auto object-contain opacity-70 grayscale transition-all duration-300 group-hover:opacity-100 group-hover:grayscale-0 group-hover:scale-105"
                />
              ) : (
                <div className="w-full h-full rounded-sm border border-dashed border-cream-3 bg-cream-0/60 flex items-center justify-center px-3 transition-all group-hover:border-primary/40 group-hover:bg-cream-0">
                  <span className="font-display text-ink-soft text-xs md:text-sm leading-tight uppercase tracking-wide">
                    {p.name}
                  </span>
                </div>
              )}
            </a>
          ))}
        </div>
        <p className="reveal mt-8 text-center text-xs text-ink-soft">
          Logos referenciales. Contacto comercial:{" "}
          <a href="mailto:contacto@tenisclubprovidencia.cl" className="story-link text-primary">
            contacto@tenisclubprovidencia.cl
          </a>
        </p>
      </div>
    </section>
  );
};
