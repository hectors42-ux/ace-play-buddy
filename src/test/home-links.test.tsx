import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

// Polyfills (algunos componentes usan estos APIs al montar).
class IO {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}
class RO {
  observe() {}
  unobserve() {}
  disconnect() {}
}
const g = globalThis as unknown as { IntersectionObserver?: unknown; ResizeObserver?: unknown };
g.IntersectionObserver = g.IntersectionObserver ?? IO;
g.ResizeObserver = g.ResizeObserver ?? RO;

/**
 * E2E de los enlaces del Home: cada CTA / link debe navegar a la ruta esperada.
 *
 * Estrategia: renderizamos el Index dentro de MemoryRouter con un componente espía
 * de ubicación; cada `Routes` adicional captura la ruta destino y la expone para
 * assertions sin re-implementar las páginas reales.
 */

// ---------- Mocks globales ----------

vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}));

vi.mock("@/lib/prefetch-routes", () => ({ prefetchAppRoutes: vi.fn() }));

const USER_ID = "user-1";

vi.mock("@/components/providers/AuthProvider", () => ({
  useAuth: () => ({
    user: { id: USER_ID },
    profile: {
      first_name: "Hector",
      last_name: "Smith",
      avatar_url: null,
      dues_status: "al_dia",
    },
    isCoach: false,
  }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: vi.fn(async (fn: string) => {
      if (fn === "my_upcoming_bookings") {
        return {
          data: [
            {
              id: "b-1",
              starts_at: new Date(Date.now() + 86400000).toISOString(),
              ends_at: new Date(Date.now() + 90000000).toISOString(),
              court_name: "Cancha 1",
              court_surface: "arcilla",
              other_first_name: "Juan",
              other_last_name: "Perez",
              i_am_owner: true,
            },
          ],
          error: null,
        };
      }
      if (fn === "user_match_history") {
        return {
          data: {
            played: [
              {
                id: "m-1",
                recorded_at: "2026-04-10T15:00:00Z",
                delta: 0.05,
                level_after: 4.0,
                source: "amistoso",
                source_ref_id: null,
                opponent_id: "u-2",
                score: [{ a: 6, b: 3 }],
                won: true,
              },
            ],
            pending_tournaments: [],
            pending_ladder: [],
            is_self: true,
            limit: 50,
          },
          error: null,
        };
      }
      if (fn === "user_profile_summary") {
        return {
          data: {
            profile: { first_name: "Hector", last_name: "Smith", avatar_url: null },
            rating: { level: 4.0 },
            recent_matches: [
              {
                played_at: "2026-04-10T15:00:00Z",
                opponent: { id: "u-2", first_name: "Juan", last_name: "P", avatar_url: null, level: 3.8 },
                won: true,
                score: [{ a: 6, b: 3 }],
                source: "amistoso",
              },
            ],
          },
          error: null,
        };
      }
      if (fn === "match_of_the_week" || fn === "tournament_pending_actions" || fn === "ladder_pending_actions") {
        return { data: null, error: null };
      }
      return { data: null, error: null };
    }),
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    })),
    removeChannel: vi.fn(),
  },
}));

// Mocks de hooks complejos: devolvemos shape mínimo para que los componentes rendericen.
vi.mock("@/hooks/useMyRatingWithCategory", () => ({
  useMyRatingWithCategory: () => ({
    rating: {
      level: 4.25,
      reliability: 78,
      matches_played: 12,
      last_change_delta: 0.05,
      sport: "tenis_singles",
    },
    category: "B",
    loading: false,
  }),
}));

vi.mock("@/hooks/useUserProfileSummary", () => ({
  useUserProfileSummary: () => ({
    data: {
      profile: { first_name: "Hector", last_name: "Smith", avatar_url: null },
      rating: { level: 4.0 },
      recent_matches: [
        {
          id: "rm-1",
          recorded_at: "2026-04-10T15:00:00Z",
          opponent_id: "u-2",
          opponent_name: "Juan P",
          opponent_avatar_url: null,
          opponent_level: 3.8,
          won: true,
          score_summary: "6-3",
          source: "amistoso",
          delta: 0.05,
          level_after: 4.0,
        },
      ],
    },
    loading: false,
  }),
}));

vi.mock("@/hooks/useAnnouncements", () => ({
  useAnnouncements: () => ({ items: [], loading: false }),
}));

vi.mock("@/hooks/useMatchOfTheWeek", () => ({
  useMatchOfTheWeek: () => ({ items: [], loading: false }),
}));

vi.mock("@/hooks/useTournamentNotifications", () => ({
  useTournamentNotifications: () => ({ counts: { total: 0 }, loading: false }),
}));
vi.mock("@/hooks/useLadderNotifications", () => ({
  useLadderNotifications: () => ({ counts: { total: 0 }, loading: false }),
}));
vi.mock("@/hooks/useCoachClasses", () => ({
  useMyStudentClasses: () => ({ data: [], loading: false }),
  useMyCoachClasses: () => ({ data: [], loading: false }),
  useCoachUpcomingClasses: () => ({ data: [], loading: false }),
  useClassBlocks: () => ({ data: [], loading: false }),
}));

// ---------- Helpers ----------

const RouteSpy = ({ label }: { label: string }) => {
  const loc = useLocation();
  return <div data-testid={`route-${label}`}>{loc.pathname + loc.search}</div>;
};

const renderHome = async () => {
  const Index = (await import("@/pages/Index")).default;
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/mis-reservas" element={<RouteSpy label="mis-reservas" />} />
          <Route path="/reservar" element={<RouteSpy label="reservar" />} />
          <Route path="/torneos" element={<RouteSpy label="torneos" />} />
          <Route path="/ranking" element={<RouteSpy label="ranking" />} />
          <Route path="/perfil" element={<RouteSpy label="perfil" />} />
          <Route path="/clases" element={<RouteSpy label="clases" />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

// ---------- Tests ----------

describe("Home — enlaces y navegación", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("HeroCard 'Ver detalle' navega a /mis-reservas cuando hay próxima reserva", async () => {
    await renderHome();
    const verDetalle = await screen.findByRole("link", { name: /ver mis reservas/i });
    fireEvent.click(verDetalle);
    await waitFor(() => {
      expect(screen.getByTestId("route-mis-reservas")).toHaveTextContent("/mis-reservas");
    });
  });

  it("Link 'Mis próximas reservas' navega a /mis-reservas cuando N>0", async () => {
    await renderHome();
    const link = await screen.findByRole("link", { name: /ver mis próximas reservas/i });
    expect(link).toHaveAttribute("href", "/mis-reservas");
  });

  it("PlayerRatingCard (compact) navega a /perfil al hacer click", async () => {
    await renderHome();
    const ratingLink = await screen.findByRole("link", { name: /tu nivel/i });
    expect(ratingLink).toHaveAttribute("href", "/perfil");
  });

  it("QuickActions: cada botón apunta a su ruta", async () => {
    await renderHome();
    expect(await screen.findByRole("link", { name: /reservar cancha/i })).toHaveAttribute(
      "href",
      "/reservar",
    );
    // "Partner" actualmente apunta a /ranking?tab=piramide&filter=retables
    const partner = screen.getByRole("link", { name: /^Partner$/i });
    expect(partner.getAttribute("href")).toMatch(/^\/ranking/);
    expect(screen.getByRole("link", { name: /^Clase$/i })).toHaveAttribute("href", "/clases");
    expect(screen.getByRole("link", { name: /^Torneos$/i })).toHaveAttribute("href", "/torneos");
  });

  it("BottomNav: cada tab apunta a su ruta", async () => {
    await renderHome();
    const nav = await screen.findByRole("navigation", { name: /navegación principal/i });
    const links = nav.querySelectorAll("a");
    const hrefs = Array.from(links).map((a) => a.getAttribute("href"));
    expect(hrefs).toContain("/");
    expect(hrefs).toContain("/reservar");
    expect(hrefs).toContain("/torneos");
    expect(hrefs).toContain("/ranking");
    expect(hrefs).toContain("/perfil");
  });

  it("HomeRecentMatchesCard 'Ver historial' abre el sheet", async () => {
    await renderHome();
    const verHistorial = await screen.findByRole("button", {
      name: /ver historial completo de partidos/i,
    });
    fireEvent.click(verHistorial);
    await waitFor(() => {
      expect(screen.getByText(/Historial de partidos/i)).toBeInTheDocument();
    });
  });
});
