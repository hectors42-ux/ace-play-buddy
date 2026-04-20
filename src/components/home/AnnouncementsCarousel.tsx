import { Megaphone, AlertTriangle, Sparkles, ExternalLink } from "lucide-react";
import { useAnnouncements } from "@/hooks/useAnnouncements";
import { cn } from "@/lib/utils";

const PRIORITY_STYLES = {
  info: {
    bg: "bg-card border-border",
    badge: "bg-muted text-muted-foreground",
    icon: Megaphone,
    label: "Info",
  },
  highlight: {
    bg: "bg-gradient-to-br from-primary/10 to-accent/10 border-primary/30",
    badge: "bg-primary text-primary-foreground",
    icon: Sparkles,
    label: "Destacado",
  },
  urgent: {
    bg: "bg-destructive/5 border-destructive/30",
    badge: "bg-destructive text-destructive-foreground",
    icon: AlertTriangle,
    label: "Importante",
  },
} as const;

export const AnnouncementsCarousel = () => {
  const { items, loading } = useAnnouncements();

  if (loading || items.length === 0) return null;

  return (
    <section aria-labelledby="anuncios-titulo" className="px-5">
      <div className="mb-3 flex items-center justify-between">
        <h2
          id="anuncios-titulo"
          className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground"
        >
          Anuncios del club
        </h2>
        <span className="text-[10px] text-muted-foreground">{items.length}</span>
      </div>
      <div className="-mx-5 overflow-x-auto scrollbar-none">
        <div className="flex snap-x snap-mandatory gap-3 px-5 pb-1">
          {items.map((a) => {
            const styles = PRIORITY_STYLES[a.priority];
            const Icon = styles.icon;
            const Wrapper = a.cta_url ? "a" : "div";
            const wrapperProps = a.cta_url
              ? { href: a.cta_url, target: "_blank", rel: "noopener noreferrer" }
              : {};
            return (
              <Wrapper
                key={a.id}
                {...(wrapperProps as { href: string })}
                className={cn(
                  "block w-[78%] shrink-0 snap-start rounded-3xl border p-4 shadow-card transition-smooth",
                  styles.bg,
                  a.cta_url && "hover:shadow-elevated active:scale-[0.99]",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div
                      className={cn(
                        "mb-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                        styles.badge,
                      )}
                    >
                      <Icon className="h-3 w-3" strokeWidth={2.5} />
                      {styles.label}
                    </div>
                    <h3 className="font-display text-base font-semibold leading-tight">
                      {a.title}
                    </h3>
                    {a.body && (
                      <p className="mt-1.5 line-clamp-3 text-xs text-muted-foreground">
                        {a.body}
                      </p>
                    )}
                    {a.cta_label && a.cta_url && (
                      <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary">
                        {a.cta_label}
                        <ExternalLink className="h-3 w-3" />
                      </span>
                    )}
                  </div>
                </div>
              </Wrapper>
            );
          })}
        </div>
      </div>
    </section>
  );
};
