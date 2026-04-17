import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/providers/AuthProvider";

export interface ClubBrand {
  id: string;
  slug: string;
  name: string;
  shortName: string;
  primary: string;
  primaryGlow: string;
  primaryDeep: string;
  logoUrl: string | null;
}

const PROVIDENCIA_FALLBACK: ClubBrand = {
  id: "fallback",
  slug: "providencia",
  name: "Club de Tenis Providencia",
  shortName: "Providencia",
  primary: "16 78% 48%",
  primaryGlow: "22 92% 58%",
  primaryDeep: "14 70% 32%",
  logoUrl: null,
};

import { createContext, useContext } from "react";

interface ClubBrandState {
  brand: ClubBrand;
  loading: boolean;
}

const ClubBrandContext = createContext<ClubBrandState | undefined>(undefined);

export const ClubBrandProvider = ({ children }: { children: React.ReactNode }) => {
  const { profile, user } = useAuth();
  const [brand, setBrand] = useState<ClubBrand>(PROVIDENCIA_FALLBACK);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadBrand = async () => {
      // Sin sesión: cargar el primer tenant (piloto) para que /auth tenga branding
      setLoading(true);
      const query = profile?.tenant_id
        ? supabase.from("tenants").select("*").eq("id", profile.tenant_id).maybeSingle()
        : supabase.from("tenants").select("*").order("created_at", { ascending: true }).limit(1).maybeSingle();

      const { data } = await query;
      if (data) {
        setBrand({
          id: data.id,
          slug: data.slug,
          name: data.name,
          shortName: data.short_name,
          primary: data.brand_primary,
          primaryGlow: data.brand_primary_glow,
          primaryDeep: data.brand_primary_deep,
          logoUrl: data.logo_url,
        });
      }
      setLoading(false);
    };
    loadBrand();
  }, [profile?.tenant_id, user?.id]);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--brand-primary", brand.primary);
    root.style.setProperty("--brand-primary-glow", brand.primaryGlow);
    root.style.setProperty("--brand-primary-deep", brand.primaryDeep);
  }, [brand]);

  return (
    <ClubBrandContext.Provider value={{ brand, loading }}>
      {children}
    </ClubBrandContext.Provider>
  );
};

export const useClubBrand = () => {
  const ctx = useContext(ClubBrandContext);
  if (!ctx) throw new Error("useClubBrand must be used within ClubBrandProvider");
  return ctx;
};
