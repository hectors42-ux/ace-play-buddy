interface LandingPartnersProps {
  partners?: string[];
}

const DEFAULT_PARTNERS = [
  "Municipalidad de Providencia",
  "Clínica MEDS",
  "Alto Tenis",
  "Pro Trainers",
  "Club Angostura",
];

export const LandingPartners = ({ partners = DEFAULT_PARTNERS }: LandingPartnersProps) => {
  return (
    <section className="bg-cream-1 border-y border-cream-2 py-14 md:py-20">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <p className="reveal label-eyebrow text-center mb-10">Nuestros partners</p>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-6 md:gap-10 items-center">
          {partners.map((p) => (
            <div
              key={p}
              className="reveal h-20 flex items-center justify-center text-center px-3"
            >
              <div className="w-full h-full rounded-sm border border-dashed border-cream-3 bg-cream-0/60 flex items-center justify-center px-3 transition-all hover:border-primary/40 hover:bg-cream-0">
                <span className="font-display text-ink-soft text-xs md:text-sm leading-tight">
                  {p}
                </span>
              </div>
            </div>
          ))}
        </div>
        <p className="reveal mt-6 text-center text-xs text-ink-soft">
          Logos referenciales. Contacto comercial:{" "}
          <a href="mailto:contacto@tenisclubprovidencia.cl" className="story-link text-primary">
            contacto@tenisclubprovidencia.cl
          </a>
        </p>
      </div>
    </section>
  );
};
