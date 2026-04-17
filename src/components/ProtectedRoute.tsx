import { Navigate, useLocation } from "react-router-dom";
import { useAuth, type AppRole } from "@/components/providers/AuthProvider";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: AppRole | AppRole[];
}

export const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const { user, roles, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-pulse rounded-full bg-primary/20" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (requiredRole) {
    const required = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    const ok = required.some((r) => roles.includes(r)) || roles.includes("super_admin");
    if (!ok) {
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
};
