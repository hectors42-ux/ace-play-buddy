import { useEffect, type ReactNode } from "react";
import { LandingNav } from "./LandingNav";
import { LandingFooter } from "./LandingFooter";

interface LandingPageShellProps {
  children: ReactNode;
  /** Título para document.title (incluir nombre del club). */
  title: string;
  /** Meta description (<160 chars). */
  description: string;
  /** Slug para canonical (relativo). */
  canonicalPath?: string;
}

/**
 * Shell común para todas las páginas del landing público.
 * Aplica:
 *  - Tipografía / paleta light forzada (`landing-light`)
 *  - SEO básico (title + meta description + og)
 *  - Nav y Footer del landing
 *  - Scroll al tope al montar
 */
export const LandingPageShell = ({
  children,
  title,
  description,
  canonicalPath,
}: LandingPageShellProps) => {
  useEffect(() => {
    document.title = title;
    const setMeta = (name: string, content: string, attr: "name" | "property" = "name") => {
      let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };
    setMeta("description", description);
    setMeta("og:title", title, "property");
    setMeta("og:description", description, "property");
    setMeta("og:type", "website", "property");

    if (canonicalPath) {
      let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement("link");
        link.rel = "canonical";
        document.head.appendChild(link);
      }
      link.href = `${window.location.origin}${canonicalPath}`;
    }

    window.scrollTo({ top: 0, behavior: "auto" });
  }, [title, description, canonicalPath]);

  return (
    <div className="landing-light bg-cream-0 text-ink-dark min-h-screen flex flex-col overflow-x-hidden">
      <LandingNav />
      <main className="flex-1 pt-24 md:pt-28">{children}</main>
      <LandingFooter />
    </div>
  );
};
