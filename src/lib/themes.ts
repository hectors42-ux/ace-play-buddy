export type ThemeId = "terre-battue" | "etat-francais";
export type ThemeMode = "light" | "dark" | "system";

export interface ThemeMeta {
  id: ThemeId;
  label: string;
  sublabel: string;
  swatches: string[]; // 4 colores para preview
  fontDisplay: string;
  fontSans: string;
}

export const THEMES: Record<ThemeId, ThemeMeta> = {
  "terre-battue": {
    id: "terre-battue",
    label: "Terre Battue",
    sublabel: "Roland Garros · clay + ivory",
    swatches: ["#b55a2e", "#5b6b3a", "#c9a35a", "#f6f1e6"],
    fontDisplay: '"Cormorant Garamond", Georgia, serif',
    fontSans: '"DM Sans", system-ui, sans-serif',
  },
  "etat-francais": {
    id: "etat-francais",
    label: "État Français",
    sublabel: "Bandera · bleu/blanc/rouge",
    swatches: ["#000091", "#e1000f", "#b8a154", "#ffffff"],
    fontDisplay: "Marcellus, Georgia, serif",
    fontSans: "Inter, system-ui, sans-serif",
  },
};

export const THEME_IDS: ThemeId[] = ["terre-battue", "etat-francais"];
export const THEME_MODES: ThemeMode[] = ["light", "dark", "system"];

export const DEFAULT_THEME: ThemeId = "terre-battue";
export const DEFAULT_MODE: ThemeMode = "light";

export const THEME_STORAGE_KEY = "aceplay.theme";
export const THEME_MODE_STORAGE_KEY = "aceplay.theme_mode";
// Flag local: "1" si el usuario cambió tema/modo desde el último sync con profiles.
// Si está activo, al hidratar el perfil hacemos PUSH (local → remoto) en vez de pull.
export const THEME_DIRTY_KEY = "aceplay.theme_dirty";

export const isThemeId = (v: unknown): v is ThemeId =>
  typeof v === "string" && (THEME_IDS as string[]).includes(v);

export const isThemeMode = (v: unknown): v is ThemeMode =>
  typeof v === "string" && (THEME_MODES as string[]).includes(v);
