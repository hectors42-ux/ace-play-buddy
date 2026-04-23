import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { AnalyticsFiltersProvider } from "@/components/analytics/AnalyticsFiltersProvider";
import { AnalyticsFiltersBar } from "@/components/analytics/AnalyticsFiltersBar";
import { cn } from "@/lib/utils";

const TABS = [
  { to: "/admin/analytics", label: "Resumen", end: true },
  { to: "/admin/analytics/operacion", label: "Operación" },
  { to: "/admin/analytics/finanzas", label: "Finanzas" },
  { to: "/admin/analytics/socios", label: "Socios" },
  { to: "/admin/analytics/coaches", label: "Coaches" },
  { to: "/admin/analytics/comunidad", label: "Comunidad" },
  { to: "/admin/analytics/alertas", label: "Alertas" },
  { to: "/admin/analytics/directorio", label: "Directorio" },
];

interface AnalyticsShellProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  hideFilters?: boolean;
}

export function AnalyticsShell({ title, subtitle, children, hideFilters }: AnalyticsShellProps) {
  return (
    <AnalyticsFiltersProvider>
      <div className="space-y-4 pb-12">
        <header className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">Analítica</p>
          <h1 className="font-display text-2xl font-semibold leading-tight md:text-3xl">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </header>

        <nav
          aria-label="Vistas de analítica"
          className="-mx-4 flex gap-1 overflow-x-auto border-b border-border/60 px-4 md:-mx-6 md:px-6"
        >
          {TABS.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.end}
              className={({ isActive }) =>
                cn(
                  "whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )
              }
            >
              {t.label}
            </NavLink>
          ))}
        </nav>

        {!hideFilters && <AnalyticsFiltersBar />}

        {children}
      </div>
    </AnalyticsFiltersProvider>
  );
}
