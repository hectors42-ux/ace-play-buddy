import { Sparkles, ArrowRight } from "lucide-react";
import heroCourts from "@/assets/hero-courts.jpg";
import { Button } from "@/components/ui/button";

export const HeroCard = () => {
  return (
    <section className="px-5">
      <div className="relative overflow-hidden rounded-[28px] shadow-elevated">
        <img
          src={heroCourts}
          alt="Vista aérea de las canchas de arcilla del Club de Tenis Providencia"
          width={1536}
          height={1024}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-overlay" />
        <div className="absolute inset-0 bg-gradient-to-br from-primary-deep/40 via-transparent to-transparent" />

        <div className="relative flex min-h-[260px] flex-col justify-end gap-4 p-6">
          <div className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-white backdrop-blur-md">
            <Sparkles className="h-3 w-3" strokeWidth={2.5} />
            Cuota al día
          </div>

          <div className="space-y-1 text-white">
            <h1 className="font-display text-3xl font-semibold leading-[1.05] tracking-tight">
              La cancha
              <br />
              te espera.
            </h1>
            <p className="max-w-[24ch] text-sm text-white/85">
              Reserva, juega y vive el club desde tu teléfono.
            </p>
          </div>

          <Button
            variant="clay"
            size="lg"
            className="w-fit"
            aria-label="Reservar cancha ahora"
          >
            Reservar ahora
            <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
          </Button>
        </div>
      </div>
    </section>
  );
};
