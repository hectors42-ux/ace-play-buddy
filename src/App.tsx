import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { ClubBrandProvider } from "@/components/providers/ClubBrandProvider";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index.tsx";
import Auth from "./pages/Auth.tsx";
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
import NotFound from "./pages/NotFound.tsx";

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
              <Routes>
                <Route path="/auth" element={<Auth />} />
                <Route path="/accept-invitation" element={<AcceptInvitation />} />
                <Route
                  path="/onboarding/nivel"
                  element={
                    <ProtectedRoute requireRatingOnboarding={false}>
                      <Onboarding />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <Index />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/reservar"
                  element={
                    <ProtectedRoute>
                      <Reservar />
                    </ProtectedRoute>
                  }
                />
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
                  path="/perfil"
                  element={
                    <ProtectedRoute>
                      <Perfil />
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
