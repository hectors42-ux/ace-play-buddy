import { useEffect } from "react";
import {
  Bell,
  Trophy,
  TrendingUp,
  TrendingDown,
  Calendar,
  CreditCard,
  Lightbulb,
  Users,
  ChevronRight,
  Home,
  Search,
  User,
} from "lucide-react";

/**
 * Mockup aislado de la nueva home del socio (AcePlay Design System v1).
 * Dark-first, monocromo, sky blue como único color saturado, Inter, geometría Swiss.
 * Estilos inline a propósito: NO toca tokens del proyecto ni Tailwind config.
 * Ruta: /mockup
 */

const tokens = {
  surface0: "#0A0D12",
  surface1: "#12161D",
  surface2: "#1A1F28",
  surface3: "#242A35",
  surface4: "#2E3542",
  borderSubtle: "#1E232C",
  borderDefault: "#2A313D",
  borderStrong: "#3A4250",
  textPrimary: "#F4F6F9",
  textSecondary: "#A8B0BD",
  textTertiary: "#6B7280",
  textDisabled: "#4A5160",
  brand: "#5FA8D3",
  brandHover: "#7BBBDE",
  brandSubtle: "rgba(95, 168, 211, 0.10)",
  success: "#4ADE80",
  successSubtle: "rgba(74, 222, 128, 0.10)",
  warning: "#F59E0B",
  warningSubtle: "rgba(245, 158, 11, 0.10)",
  danger: "#EF4444",
  gold: "#D4AF37",
};

const fontStack =
  '"Inter", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

const Mockup = () => {
  useEffect(() => {
    // Forzar fondo dark a nivel body solo dentro del mockup
    const prevBg = document.body.style.background;
    const prevColor = document.body.style.color;
    document.body.style.background = tokens.surface0;
    document.body.style.color = tokens.textPrimary;
    return () => {
      document.body.style.background = prevBg;
      document.body.style.color = prevColor;
    };
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: tokens.surface0,
        color: tokens.textPrimary,
        fontFamily: fontStack,
        WebkitFontSmoothing: "antialiased",
        paddingBottom: 96,
      }}
    >
      {/* === Banda superior: contexto de mockup === */}
      <div
        style={{
          padding: "10px 20px",
          background: tokens.surface1,
          borderBottom: `1px solid ${tokens.borderSubtle}`,
          fontSize: 11,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: tokens.textTertiary,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span>Mockup · /mockup · datos falsos</span>
        <span style={{ color: tokens.brand }}>AcePlay DS v1 · dark</span>
      </div>

      <div
        style={{
          maxWidth: 440,
          margin: "0 auto",
          padding: "20px 20px 24px",
        }}
      >
        {/* === Header === */}
        <header
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 28,
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 999,
              background: tokens.surface3,
              border: `1px solid ${tokens.borderDefault}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: "-0.01em",
              color: tokens.textPrimary,
            }}
            aria-label="Avatar de Héctor Smith"
          >
            HS
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 12,
                color: tokens.textTertiary,
                letterSpacing: "0.02em",
              }}
            >
              Buenas tardes
            </div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: tokens.textPrimary,
                letterSpacing: "-0.01em",
                lineHeight: 1.2,
              }}
            >
              Héctor Smith
            </div>
          </div>
          <button
            type="button"
            style={{
              position: "relative",
              width: 40,
              height: 40,
              borderRadius: 8,
              background: tokens.surface2,
              border: `1px solid ${tokens.borderDefault}`,
              color: tokens.textSecondary,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
            aria-label="Notificaciones (2 sin leer)"
          >
            <Bell size={18} strokeWidth={1.75} />
            <span
              style={{
                position: "absolute",
                top: 9,
                right: 9,
                width: 6,
                height: 6,
                borderRadius: 999,
                background: tokens.brand,
              }}
            />
          </button>
        </header>

        {/* === Hero: próxima actividad === */}
        <section
          style={{
            background: tokens.surface1,
            border: `1px solid ${tokens.borderDefault}`,
            borderRadius: 12,
            padding: 20,
            marginBottom: 12,
          }}
          aria-label="Próxima actividad"
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 11,
              fontWeight: 500,
              padding: "4px 8px",
              borderRadius: 4,
              background: tokens.brandSubtle,
              color: tokens.brand,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              marginBottom: 14,
            }}
          >
            Tu turno · hoy
          </div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 600,
              letterSpacing: "-0.02em",
              lineHeight: 1.15,
              color: tokens.textPrimary,
              marginBottom: 6,
            }}
          >
            Cancha Central · 19:00
          </div>
          <div
            style={{
              fontSize: 14,
              color: tokens.textSecondary,
              lineHeight: 1.4,
              marginBottom: 18,
            }}
          >
            Singles vs Diego Salinas · 90 min con luz
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              style={{
                flex: 1,
                height: 44,
                borderRadius: 8,
                background: tokens.brand,
                color: tokens.surface0,
                border: "none",
                fontSize: 14,
                fontWeight: 600,
                letterSpacing: "-0.005em",
                cursor: "pointer",
                fontFamily: fontStack,
              }}
            >
              Check-in
            </button>
            <button
              type="button"
              style={{
                flex: 1,
                height: 44,
                borderRadius: 8,
                background: "transparent",
                color: tokens.textPrimary,
                border: `1px solid ${tokens.borderStrong}`,
                fontSize: 14,
                fontWeight: 500,
                cursor: "pointer",
                fontFamily: fontStack,
              }}
            >
              Detalle
            </button>
          </div>
        </section>

        {/* === Grid 2x: Ranking + Cuenta === */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
            marginBottom: 12,
          }}
        >
          <Card>
            <CardEyebrow icon={<Trophy size={12} strokeWidth={2} />}>
              Mi ranking
            </CardEyebrow>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 6,
                marginTop: 6,
              }}
            >
              <span
                style={{
                  fontSize: 32,
                  fontWeight: 600,
                  letterSpacing: "-0.03em",
                  lineHeight: 1,
                  color: tokens.textPrimary,
                }}
              >
                #14
              </span>
              <span
                style={{
                  fontSize: 12,
                  color: tokens.textTertiary,
                }}
              >
                / 84
              </span>
            </div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                marginTop: 8,
                fontSize: 12,
                color: tokens.success,
              }}
            >
              <TrendingUp size={12} strokeWidth={2} />
              <span>+3 esta semana</span>
            </div>
            <div
              style={{
                marginTop: 4,
                fontSize: 11,
                color: tokens.textTertiary,
              }}
            >
              Categoría Segunda
            </div>
          </Card>

          <Card>
            <CardEyebrow icon={<CreditCard size={12} strokeWidth={2} />}>
              Mi cuenta
            </CardEyebrow>
            <div
              style={{
                fontSize: 32,
                fontWeight: 600,
                letterSpacing: "-0.03em",
                lineHeight: 1,
                color: tokens.textPrimary,
                marginTop: 6,
              }}
            >
              $0
            </div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                marginTop: 8,
                fontSize: 11,
                fontWeight: 500,
                padding: "3px 8px",
                borderRadius: 4,
                background: tokens.successSubtle,
                color: tokens.success,
                letterSpacing: "0.02em",
              }}
            >
              Al día
            </div>
            <div
              style={{
                marginTop: 4,
                fontSize: 11,
                color: tokens.textTertiary,
              }}
            >
              Próx. cuota: 5 may
            </div>
          </Card>
        </div>

        {/* === Torneo activo === */}
        <Section title="Torneo activo">
          <button
            type="button"
            style={{
              width: "100%",
              textAlign: "left",
              background: tokens.surface1,
              border: `1px solid ${tokens.borderDefault}`,
              borderRadius: 12,
              padding: 16,
              display: "flex",
              alignItems: "center",
              gap: 14,
              cursor: "pointer",
              fontFamily: fontStack,
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 8,
                background: tokens.brandSubtle,
                color: tokens.brand,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Trophy size={20} strokeWidth={1.75} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  color: tokens.textPrimary,
                  letterSpacing: "-0.01em",
                  marginBottom: 2,
                }}
              >
                Open Otoño · Segunda
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: tokens.textSecondary,
                }}
              >
                Octavos · próximo partido sábado 19
              </div>
            </div>
            <ChevronRight
              size={18}
              strokeWidth={1.75}
              color={tokens.textTertiary}
            />
          </button>
        </Section>

        {/* === Atajos === */}
        <Section title="Atajos">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
            }}
          >
            <Shortcut icon={<Calendar size={18} strokeWidth={1.75} />} label="Reservar" />
            <Shortcut icon={<Users size={18} strokeWidth={1.75} />} label="Buscar partner" />
            <Shortcut icon={<Lightbulb size={18} strokeWidth={1.75} />} label="Iniciar luz" />
            <Shortcut icon={<TrendingDown size={18} strokeWidth={1.75} />} label="Desafiar ranking" />
          </div>
        </Section>

        {/* === Última actividad === */}
        <Section title="Última actividad">
          <div
            style={{
              background: tokens.surface1,
              border: `1px solid ${tokens.borderDefault}`,
              borderRadius: 12,
              overflow: "hidden",
            }}
          >
            <ActivityRow
              who="vs Diego Salinas"
              meta="Singles · Cancha Central"
              score="6-4 · 7-5"
              wonOrLost="won"
            />
            <Divider />
            <ActivityRow
              who="vs Pablo Reyes"
              meta="Open Otoño · 16avos"
              score="6-3 · 6-2"
              wonOrLost="won"
            />
            <Divider />
            <ActivityRow
              who="vs Tomás León"
              meta="Singles · Cancha 3"
              score="3-6 · 4-6"
              wonOrLost="lost"
            />
          </div>
        </Section>
      </div>

      {/* === Bottom nav === */}
      <nav
        aria-label="Navegación principal"
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          background: `${tokens.surface1}E6`,
          borderTop: `1px solid ${tokens.borderSubtle}`,
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          paddingBottom: "max(8px, env(safe-area-inset-bottom))",
        }}
      >
        <div
          style={{
            maxWidth: 440,
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "repeat(5, 1fr)",
            padding: "8px 4px 0",
          }}
        >
          <NavItem icon={<Home size={20} strokeWidth={2} />} label="Inicio" active />
          <NavItem icon={<Trophy size={20} strokeWidth={1.75} />} label="Torneos" />
          <NavItem icon={<Calendar size={20} strokeWidth={1.75} />} label="Reservar" />
          <NavItem icon={<Search size={20} strokeWidth={1.75} />} label="Partner" />
          <NavItem icon={<User size={20} strokeWidth={1.75} />} label="Cuenta" />
        </div>
      </nav>
    </div>
  );
};

/* ----- Subcomponentes inline ----- */

const Card = ({ children }: { children: React.ReactNode }) => (
  <div
    style={{
      background: tokens.surface1,
      border: `1px solid ${tokens.borderDefault}`,
      borderRadius: 12,
      padding: 16,
    }}
  >
    {children}
  </div>
);

const CardEyebrow = ({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      fontSize: 11,
      letterSpacing: "0.06em",
      textTransform: "uppercase",
      color: tokens.textTertiary,
      fontWeight: 500,
    }}
  >
    {icon}
    <span>{children}</span>
  </div>
);

const Section = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <section style={{ marginTop: 20 }} aria-labelledby={`sec-${title}`}>
    <h2
      id={`sec-${title}`}
      style={{
        fontSize: 11,
        fontWeight: 500,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: tokens.textTertiary,
        margin: "0 0 10px",
      }}
    >
      {title}
    </h2>
    {children}
  </section>
);

const Shortcut = ({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) => (
  <button
    type="button"
    style={{
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "12px 14px",
      borderRadius: 10,
      background: tokens.surface1,
      border: `1px solid ${tokens.borderDefault}`,
      color: tokens.textPrimary,
      fontSize: 13,
      fontWeight: 500,
      cursor: "pointer",
      fontFamily: fontStack,
      textAlign: "left",
    }}
  >
    <span style={{ color: tokens.textSecondary, display: "flex" }}>{icon}</span>
    {label}
  </button>
);

const Divider = () => (
  <div style={{ height: 1, background: tokens.borderSubtle }} />
);

const ActivityRow = ({
  who,
  meta,
  score,
  wonOrLost,
}: {
  who: string;
  meta: string;
  score: string;
  wonOrLost: "won" | "lost";
}) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "14px 16px",
    }}
  >
    <div
      style={{
        width: 8,
        height: 8,
        borderRadius: 999,
        background: wonOrLost === "won" ? tokens.success : tokens.textDisabled,
        flexShrink: 0,
      }}
    />
    <div style={{ flex: 1, minWidth: 0 }}>
      <div
        style={{
          fontSize: 14,
          fontWeight: 500,
          color: tokens.textPrimary,
          letterSpacing: "-0.005em",
        }}
      >
        {who}
      </div>
      <div style={{ fontSize: 12, color: tokens.textTertiary, marginTop: 2 }}>
        {meta}
      </div>
    </div>
    <div
      style={{
        fontFamily:
          '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
        fontSize: 12,
        color: tokens.textSecondary,
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {score}
    </div>
  </div>
);

const NavItem = ({
  icon,
  label,
  active,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}) => (
  <button
    type="button"
    style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 4,
      padding: "8px 4px",
      background: "transparent",
      border: "none",
      cursor: "pointer",
      color: active ? tokens.brand : tokens.textTertiary,
      fontFamily: fontStack,
    }}
    aria-current={active ? "page" : undefined}
  >
    {icon}
    <span style={{ fontSize: 10, fontWeight: 500, letterSpacing: "0.02em" }}>
      {label}
    </span>
  </button>
);

export default Mockup;
