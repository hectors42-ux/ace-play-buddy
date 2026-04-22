import { Instagram, Mail, Phone, MapPin } from "lucide-react";
import clubLogo from "@/assets/club-logo.png";

export const LandingFooter = () => {
  return (
    <footer className="bg-ink-dark text-cream-1">
      <div className="mx-auto max-w-7xl px-5 md:px-8 py-16 md:py-20">
        <div className="grid gap-12 md:grid-cols-12">
          <div className="md:col-span-5 space-y-5">
            <div className="flex items-center gap-3">
              <img
                src={clubLogo}
                alt="Club de Tenis Providencia"
                width={48}
                height={48}
                className="h-12 w-12 object-contain bg-cream-0 rounded-xl p-1"
              />
              <div className="font-display text-lg leading-tight">
                Club de Tenis<br />
                <span className="text-cream-1/70 text-sm font-normal">Providencia</span>
              </div>
            </div>
            <p className="font-display text-2xl md:text-3xl leading-tight text-cream-0">
              50 años haciendo<br />historia del tenis chileno.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <a
                href="https://instagram.com/tenisprovidencia"
                target="_blank"
                rel="noopener noreferrer"
                className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-primary transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="h-4 w-4" />
              </a>
            </div>
          </div>

          <div className="md:col-span-7 grid grid-cols-2 md:grid-cols-3 gap-8 text-sm">
            <div>
              <p className="label-eyebrow text-cream-1/60 mb-4">El Club</p>
              <ul className="space-y-3">
                <li><a href="#club" className="hover:text-primary-glow transition-colors">Quiénes somos</a></li>
                <li><a href="#club" className="hover:text-primary-glow transition-colors">Historia</a></li>
                <li><a href="#equipo" className="hover:text-primary-glow transition-colors">Directorio</a></li>
                <li><a href="#academia" className="hover:text-primary-glow transition-colors">Academia</a></li>
              </ul>
            </div>
            <div>
              <p className="label-eyebrow text-cream-1/60 mb-4">Socios</p>
              <ul className="space-y-3">
                <li><a href="/app" className="hover:text-primary-glow transition-colors">Reservar cancha</a></li>
                <li><a href="#socios" className="hover:text-primary-glow transition-colors">Hazte socio</a></li>
                <li><a href="#socios" className="hover:text-primary-glow transition-colors">Tarifas</a></li>
              </ul>
            </div>
            <div>
              <p className="label-eyebrow text-cream-1/60 mb-4">Contacto</p>
              <ul className="space-y-3 text-cream-1/85">
                <li className="flex items-start gap-2"><MapPin className="h-4 w-4 mt-0.5 shrink-0" />El Vergel 2855, Providencia</li>
                <li className="flex items-start gap-2"><Phone className="h-4 w-4 mt-0.5 shrink-0" />+56 2 2706 4500</li>
                <li className="flex items-start gap-2"><Mail className="h-4 w-4 mt-0.5 shrink-0" />contacto@tenisclubprovidencia.cl</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="court-line my-10 opacity-30" />

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 text-xs text-cream-1/60">
          <p>© 2026 Club de Tenis Providencia · Todos los derechos reservados</p>
          <p className="tracking-[0.2em] uppercase">Powered by AcePlay</p>
        </div>
      </div>
    </footer>
  );
};
