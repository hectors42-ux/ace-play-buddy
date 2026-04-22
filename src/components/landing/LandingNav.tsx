import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import clubLogo from "@/assets/club-logo.png";

/**
 * Links del nav.
 * - href que comienza con `#` → ancla dentro del landing principal.
 *   Si el usuario no está en `/landing-preview`, se navega primero a esa página.
 * - href que comienza con `/` → ruta a otra página del landing.
 */
const links: { href: string; label: string }[] = [
  { href: "/landing-preview#club", label: "El Club" },
  { href: "/academia", label: "Academia" },
  { href: "/historia", label: "Historia" },
  { href: "/equipo", label: "Equipo" },
  { href: "/noticias", label: "Noticias" },
  { href: "/landing-preview#contacto", label: "Contacto" },
];

export const LandingNav = () => {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  // En sub-páginas el nav siempre va sobre fondo claro → forzar el estilo "scrolled".
  const onLandingHome = pathname === "/landing-preview" || pathname === "/landing-preview/";
  const isScrolledLook = scrolled || !onLandingHome;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Construye href: las anclas dentro del home siempre llevan al landing-preview
  const resolveHref = (href: string) => {
    if (href.startsWith("#")) return `/landing-preview${href}`;
    return href;
  };

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        isScrolledLook
          ? "bg-cream-0/90 backdrop-blur-xl border-b border-cream-2 shadow-card"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 md:px-8">
        <Link to="/landing-preview" className="flex items-center gap-2 sm:gap-3 min-w-0">
          <img
            src={clubLogo}
            alt="Club de Tenis Providencia"
            width={40}
            height={40}
            className="h-9 w-9 sm:h-10 sm:w-10 object-contain shrink-0"
          />
          <span
            className={`font-display text-sm sm:text-base font-semibold leading-tight transition-colors truncate ${
              isScrolledLook ? "text-ink-dark" : "text-cream-0"
            }`}
          >
            Club de Tenis
            <span className="hidden xs:inline"><br /><span className="text-xs font-normal opacity-80">Providencia · 1975</span></span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          {links.map((l) =>
            l.href.startsWith("/") && !l.href.includes("#") ? (
              <Link
                key={l.href}
                to={l.href}
                className={`story-link text-sm font-medium transition-colors ${
                  isScrolledLook ? "text-ink-dark hover:text-primary" : "text-cream-0 hover:text-cream-0"
                }`}
              >
                {l.label}
              </Link>
            ) : (
              <a
                key={l.href}
                href={resolveHref(l.href)}
                className={`story-link text-sm font-medium transition-colors ${
                  isScrolledLook ? "text-ink-dark hover:text-primary" : "text-cream-0 hover:text-cream-0"
                }`}
              >
                {l.label}
              </a>
            ),
          )}
          <Link to="/app">
            <Button variant="clay" size="sm">
              Ingresar →
            </Button>
          </Link>
        </nav>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild className="md:hidden">
            <button
              aria-label="Abrir menú"
              className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
                isScrolledLook ? "text-ink-dark bg-cream-1" : "text-cream-0 bg-white/10"
              }`}
            >
              <Menu className="h-5 w-5" />
            </button>
          </SheetTrigger>
          <SheetContent side="right" className="bg-cream-0 border-cream-2 w-[85vw] sm:w-[400px]">
            <div className="flex flex-col gap-1 pt-8">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-2">
                  <img src={clubLogo} alt="" width={36} height={36} className="h-9 w-9" />
                  <span className="font-display text-sm text-ink-dark">Club Providencia</span>
                </div>
                <button
                  aria-label="Cerrar"
                  onClick={() => setOpen(false)}
                  className="h-9 w-9 rounded-full bg-cream-1 flex items-center justify-center text-ink-dark"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              {links.map((l) =>
                l.href.startsWith("/") && !l.href.includes("#") ? (
                  <Link
                    key={l.href}
                    to={l.href}
                    onClick={() => setOpen(false)}
                    className="font-display text-2xl text-ink-dark py-3 border-b border-cream-2"
                  >
                    {l.label}
                  </Link>
                ) : (
                  <a
                    key={l.href}
                    href={resolveHref(l.href)}
                    onClick={() => setOpen(false)}
                    className="font-display text-2xl text-ink-dark py-3 border-b border-cream-2"
                  >
                    {l.label}
                  </a>
                ),
              )}
              <Link to="/app" className="mt-6">
                <Button variant="clay" size="lg" className="w-full">
                  Ingresar a la app →
                </Button>
              </Link>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
};
