import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { ClubBrandProvider } from "@/components/providers/ClubBrandProvider";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import ScrollToTop from "@/components/ScrollToTop";
import Landing from "./pages/Landing.tsx";
import Historia from "./pages/landing/Historia.tsx";
import Academia from "./pages/landing/Academia.tsx";
import Equipo from "./pages/landing/Equipo.tsx";
import Noticias from "./pages/landing/Noticias.tsx";
import NoticiaDetalle from "./pages/landing/NoticiaDetalle.tsx";
import Index from "./pages/Index.tsx";
import Auth from "./pages/Auth.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";
import AcceptInvitation from "./pages/AcceptInvitation.tsx";
import AdminMembers from "./pages/AdminMembers.tsx";
import AdminCourts from "./pages/AdminCourts.tsx";
import Reservar from "./pages/Reservar.tsx";
import Torneos from "./pages/Torneos.tsx";
import TorneoDetalle from "./pages/TorneoDetalle.tsx";
import AdminTorneos from "./pages/AdminTorneos.tsx";
import AdminTorneoDetalle from "./pages/AdminTorneoDetalle.tsx";
import AdminCategoryDetail from "./pages/AdminCategoryDetail.tsx";
import TournamentCategoryDetail from "./pages/TournamentCategoryDetail.tsx";
import Ranking from "./pages/Ranking.tsx";
import AdminLadder from "./pages/AdminLadder.tsx";
import AdminLadderDetail from "./pages/AdminLadderDetail.tsx";
import Onboarding from "./pages/Onboarding.tsx";
import Perfil from "./pages/Perfil.tsx";
import AdminAnnouncements from "./pages/AdminAnnouncements.tsx";
import AdminLegalDocs from "./pages/AdminLegalDocs.tsx";
import Clases from "./pages/Clases.tsx";
import CoachPanel from "./pages/CoachPanel.tsx";
import AdminClases from "./pages/AdminClases.tsx";
import Install from "./pages/Install.tsx";
import NotFound from "./pages/NotFound.tsx";
import DevPreview from "./pages/DevPreview.tsx";
import AnalyticsOverview from "./pages/admin/analytics/AnalyticsOverview.tsx";
import AnalyticsOperation from "./pages/admin/analytics/AnalyticsOperation.tsx";
import AnalyticsFinance from "./pages/admin/analytics/AnalyticsFinance.tsx";
import AnalyticsMembers from "./pages/admin/analytics/AnalyticsMembers.tsx";
import AnalyticsCoaches from "./pages/admin/analytics/AnalyticsCoaches.tsx";
import AnalyticsCommunity from "./pages/admin/analytics/AnalyticsCommunity.tsx";
import AnalyticsAlerts from "./pages/admin/analytics/AnalyticsAlerts.tsx";
import AnalyticsDirectory from "./pages/admin/analytics/AnalyticsDirectory.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="light" storageKey="aceplay-theme">
      <BrowserRouter>
        <AuthProvider>
          <ClubBrandProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <ScrollToTop />
              <Routes>
                {/* Home: app principal (protegida). El Landing público quedará aquí cuando se apruebe. */}
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <Index />
                    </ProtectedRoute>
                  }
                />

                {/* Vista previa interna del Landing (no enlazada públicamente) */}
                <Route path="/landing-preview" element={<Landing />} />

                {/* Páginas públicas del landing */}
                <Route path="/historia" element={<Historia />} />
                <Route path="/academia" element={<Academia />} />
                <Route path="/equipo" element={<Equipo />} />
                <Route path="/noticias" element={<Noticias />} />
                <Route path="/noticias/:slug" element={<NoticiaDetalle />} />

                {/* Auth */}
                <Route path="/auth" element={<Auth />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/accept-invitation" element={<AcceptInvitation />} />
                <Route path="/install" element={<Install />} />

                {/* Aliases compatibilidad */}
                <Route path="/app" element={<Navigate to="/" replace />} />
                <Route path="/inicio" element={<Navigate to="/" replace />} />

                {/* Onboarding */}
                <Route
                  path="/onboarding/nivel"
                  element={
                    <ProtectedRoute requireRatingOnboarding={false} bareLayout>
                      <Onboarding />
                    </ProtectedRoute>
                  }
                />

                {/* Rutas internas de la app — mantenidas para compatibilidad con Links existentes */}
                <Route
                  path="/reservar"
                  element={
                    <ProtectedRoute>
                      <Reservar />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/torneos"
                  element={
                    <ProtectedRoute>
                      <Torneos />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/torneos/:slug"
                  element={
                    <ProtectedRoute>
                      <TorneoDetalle />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/torneos/:slug/cat/:catId"
                  element={
                    <ProtectedRoute>
                      <TournamentCategoryDetail />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/ranking"
                  element={
                    <ProtectedRoute>
                      <Ranking />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/ladder"
                  element={
                    <ProtectedRoute>
                      <Ranking />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/perfil"
                  element={
                    <ProtectedRoute>
                      <Perfil />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/clases"
                  element={
                    <ProtectedRoute>
                      <Clases />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/coach"
                  element={
                    <ProtectedRoute>
                      <CoachPanel />
                    </ProtectedRoute>
                  }
                />

                {/* Admin */}
                <Route
                  path="/admin/socios"
                  element={
                    <ProtectedRoute requiredRole={["club_admin", "super_admin"]}>
                      <AdminMembers />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/canchas"
                  element={
                    <ProtectedRoute requiredRole={["club_admin", "super_admin"]}>
                      <AdminCourts />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/torneos"
                  element={
                    <ProtectedRoute requiredRole={["club_admin", "super_admin"]}>
                      <AdminTorneos />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/torneos/:id"
                  element={
                    <ProtectedRoute requiredRole={["club_admin", "super_admin"]}>
                      <AdminTorneoDetalle />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/torneos/:id/cat/:catId"
                  element={
                    <ProtectedRoute requiredRole={["club_admin", "super_admin"]}>
                      <AdminCategoryDetail />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/ladder"
                  element={
                    <ProtectedRoute requiredRole={["club_admin", "super_admin"]}>
                      <AdminLadder />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/ladder/:id"
                  element={
                    <ProtectedRoute requiredRole={["club_admin", "super_admin"]}>
                      <AdminLadderDetail />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/comunicaciones"
                  element={
                    <ProtectedRoute requiredRole={["club_admin", "super_admin"]}>
                      <AdminAnnouncements />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/documentos"
                  element={
                    <ProtectedRoute requiredRole={["club_admin", "super_admin"]}>
                      <AdminLegalDocs />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/clases"
                  element={
                    <ProtectedRoute requiredRole={["club_admin", "super_admin"]}>
                      <AdminClases />
                    </ProtectedRoute>
                  }
                />

                {/* Analytics & BI Gerencial */}
                <Route
                  path="/admin/analytics"
                  element={
                    <ProtectedRoute requiredRole={["club_admin", "super_admin"]}>
                      <AnalyticsOverview />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/analytics/operacion"
                  element={
                    <ProtectedRoute requiredRole={["club_admin", "super_admin"]}>
                      <AnalyticsOperation />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/analytics/finanzas"
                  element={
                    <ProtectedRoute requiredRole={["club_admin", "super_admin"]}>
                      <AnalyticsFinance />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/analytics/socios"
                  element={
                    <ProtectedRoute requiredRole={["club_admin", "super_admin"]}>
                      <AnalyticsMembers />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/analytics/coaches"
                  element={
                    <ProtectedRoute requiredRole={["club_admin", "super_admin"]}>
                      <AnalyticsCoaches />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/analytics/comunidad"
                  element={
                    <ProtectedRoute requiredRole={["club_admin", "super_admin"]}>
                      <AnalyticsCommunity />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/analytics/alertas"
                  element={
                    <ProtectedRoute requiredRole={["club_admin", "super_admin"]}>
                      <AnalyticsAlerts />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/analytics/directorio"
                  element={
                    <ProtectedRoute requiredRole={["super_admin"]}>
                      <AnalyticsDirectory />
                    </ProtectedRoute>
                  }
                />

                {/* Preview interno responsive (solo dev) */}
                <Route path="/dev/preview" element={<DevPreview />} />

                <Route path="*" element={<NotFound />} />
              </Routes>
            </TooltipProvider>
          </ClubBrandProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
