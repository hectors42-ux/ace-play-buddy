import { createContext, useContext, useEffect, useState } from "react";

export interface ClubBrand {
  id: string;
  name: string;
  shortName: string;
  /** HSL triplet sin hsl() */
  primary: string;
  primaryGlow: string;
  primaryDeep: string;
}

const PROVIDENCIA: ClubBrand = {
  id: "providencia",
  name: "Club de Tenis Providencia",
  shortName: "Providencia",
  primary: "16 78% 48%",
  primaryGlow: "22 92% 58%",
  primaryDeep: "14 70% 32%",
};

interface ClubBrandState {
  brand: ClubBrand;
  setBrand: (brand: ClubBrand) => void;
}

const ClubBrandContext = createContext<ClubBrandState | undefined>(undefined);

export const ClubBrandProvider = ({
  children,
  initialBrand = PROVIDENCIA,
}: {
  children: React.ReactNode;
  initialBrand?: ClubBrand;
}) => {
  const [brand, setBrand] = useState<ClubBrand>(initialBrand);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--brand-primary", brand.primary);
    root.style.setProperty("--brand-primary-glow", brand.primaryGlow);
    root.style.setProperty("--brand-primary-deep", brand.primaryDeep);
  }, [brand]);

  return (
    <ClubBrandContext.Provider value={{ brand, setBrand }}>
      {children}
    </ClubBrandContext.Provider>
  );
};

export const useClubBrand = () => {
  const ctx = useContext(ClubBrandContext);
  if (!ctx) throw new Error("useClubBrand must be used within ClubBrandProvider");
  return ctx;
};
