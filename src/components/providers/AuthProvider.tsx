import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/analytics";

export type AppRole = "super_admin" | "club_admin" | "staff" | "member";

export interface UserProfile {
  id: string;
  user_id: string;
  tenant_id: string;
  email: string;
  first_name: string;
  last_name: string;
  rut: string | null;
  phone: string | null;
  avatar_url: string | null;
  ntrp_level: number | null;
  club_ranking: number | null;
  dues_status: "al_dia" | "pendiente" | "moroso" | "suspendido";
  member_since: string;
}

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  roles: AppRole[];
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  hasRole: (role: AppRole) => boolean;
  isAdmin: boolean;
  isCoach: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [isCoach, setIsCoach] = useState(false);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();
  // Trackea el último user_id procesado para detectar cambios de cuenta
  // y limpiar el cache de React Query (evita ver datos del usuario anterior).
  const lastUserIdRef = useRef<string | null>(null);

  const fetchProfileAndRoles = async (userId: string) => {
    const [profileRes, rolesRes, coachRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
      supabase
        .from("coach_profiles")
        .select("id")
        .eq("user_id", userId)
        .eq("is_active", true)
        .maybeSingle(),
    ]);
    setProfile((profileRes.data as UserProfile | null) ?? null);
    setRoles(((rolesRes.data ?? []) as { role: AppRole }[]).map((r) => r.role));
    setIsCoach(!!coachRes.data);
  };

  useEffect(() => {
    // 1) Listener PRIMERO (sin async dentro del callback)
    const { data: sub } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      const newUserId = newSession?.user?.id ?? null;

      // Si cambia el usuario (login distinto, logout) → limpiar TODO el cache.
      // Esto evita que datos del usuario anterior queden visibles en la nueva sesión.
      if (lastUserIdRef.current !== newUserId) {
        queryClient.clear();
        lastUserIdRef.current = newUserId;
      }

      if (newSession?.user) {
        setLoading(true);
        // diferir fetch para evitar deadlocks
        setTimeout(() => {
          fetchProfileAndRoles(newSession.user.id).finally(() => setLoading(false));
        }, 0);
        if (event === "SIGNED_IN") {
          // Telemetría de login (diferida para no bloquear el callback)
          setTimeout(() => trackEvent("auth_login", { user_id: newSession.user.id }), 0);
        }
      } else {
        setProfile(null);
        setRoles([]);
        setIsCoach(false);
        setLoading(false);
      }
    });

    // 2) Después getSession
    supabase.auth.getSession().then(({ data: { session: existing } }) => {
      setSession(existing);
      setUser(existing?.user ?? null);
      lastUserIdRef.current = existing?.user?.id ?? null;
      if (existing?.user) {
        fetchProfileAndRoles(existing.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, [queryClient]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setRoles([]);
    setIsCoach(false);
    // Limpieza explícita por si onAuthStateChange demora.
    queryClient.clear();
    lastUserIdRef.current = null;
  };

  const refreshProfile = async () => {
    if (user) await fetchProfileAndRoles(user.id);
  };

  const hasRole = (role: AppRole) => roles.includes(role);
  const isAdmin = roles.includes("super_admin") || roles.includes("club_admin");

  return (
    <AuthContext.Provider
      value={{ user, session, profile, roles, loading, signOut, refreshProfile, hasRole, isAdmin, isCoach }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
