import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  DEFAULT_MODE,
  DEFAULT_THEME,
  isThemeId,
  isThemeMode,
  THEME_DIRTY_KEY,
  THEME_MODE_STORAGE_KEY,
  THEME_STORAGE_KEY,
  ThemeId,
  ThemeMode,
} from "@/lib/themes";

export type ThemeSyncStatus =
  | "local-only" // sin sesión: solo localStorage
  | "saving"     // escribiendo a profiles
  | "synced"     // local == profiles
  | "pending"    // hay cambios locales sin pushear (offline / falló update)
  | "error";     // último intento devolvió error

interface ThemeCtx {
  theme: ThemeId;
  mode: ThemeMode;
  resolvedDark: boolean;
  setTheme: (t: ThemeId) => void;
  setMode: (m: ThemeMode) => void;
  syncStatus: ThemeSyncStatus;
  lastSyncedAt: number | null;
}

const Ctx = createContext<ThemeCtx | null>(null);

const readInitial = <T,>(key: string, guard: (v: unknown) => v is T, fallback: T): T => {
  if (typeof window === "undefined") return fallback;
  try {
    const v = localStorage.getItem(key);
    return guard(v) ? v : fallback;
  } catch {
    return fallback;
  }
};

const safeSet = (k: string, v: string) => {
  try { localStorage.setItem(k, v); } catch { /* ignore */ }
};
const safeDel = (k: string) => {
  try { localStorage.removeItem(k); } catch { /* ignore */ }
};
const isDirty = () => {
  try { return localStorage.getItem(THEME_DIRTY_KEY) === "1"; } catch { return false; }
};

const applyToHtml = (theme: ThemeId, dark: boolean) => {
  const root = document.documentElement;
  root.classList.remove("theme-terre-battue", "theme-etat-francais");
  root.classList.add(`theme-${theme}`);
  root.classList.toggle("dark", dark);
};

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setThemeState] = useState<ThemeId>(() =>
    readInitial(THEME_STORAGE_KEY, isThemeId, DEFAULT_THEME),
  );
  const [mode, setModeState] = useState<ThemeMode>(() =>
    readInitial(THEME_MODE_STORAGE_KEY, isThemeMode, DEFAULT_MODE),
  );
  const [systemDark, setSystemDark] = useState<boolean>(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
      : false,
  );
  const [syncStatus, setSyncStatus] = useState<ThemeSyncStatus>(() =>
    isDirty() ? "pending" : "local-only",
  );
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener?.("change", handler);
    return () => mq.removeEventListener?.("change", handler);
  }, []);

  const resolvedDark = mode === "dark" || (mode === "system" && systemDark);

  useEffect(() => {
    applyToHtml(theme, resolvedDark);
  }, [theme, resolvedDark]);

  // Sync con profiles. Estrategia:
  //  - Si el flag local "dirty" está activo (el usuario cambió algo desde el último sync) → PUSH local → remoto.
  //  - Si NO está dirty → PULL remoto → local (cross-device).
  //  - Tras cualquiera de los dos, limpiamos el flag.
  useEffect(() => {
    let cancelled = false;

    const sync = async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const user = userRes?.user;
      if (!user || cancelled) return;

      // Snapshot del estado local actual (leemos directo de localStorage para
      // evitar capturar estado obsoleto del closure).
      const localTheme = readInitial(THEME_STORAGE_KEY, isThemeId, DEFAULT_THEME);
      const localMode = readInitial(THEME_MODE_STORAGE_KEY, isThemeMode, DEFAULT_MODE);
      const dirty = isDirty();

      if (dirty) {
        // PUSH: el usuario cambió localmente, gana lo local.
        try {
          await supabase
            .from("profiles")
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .update({ theme: localTheme, theme_mode: localMode } as any)
            .eq("user_id", user.id);
          safeDel(THEME_DIRTY_KEY);
        } catch {
          /* offline: mantenemos dirty para reintentar en el próximo login */
        }
        return;
      }

      // PULL: no hay cambios locales pendientes, adoptar lo remoto.
      const { data: prof } = await supabase
        .from("profiles")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .select("theme, theme_mode" as any)
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled || !prof) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const p = prof as any;
      if (isThemeId(p.theme) && p.theme !== localTheme) {
        setThemeState(p.theme);
        safeSet(THEME_STORAGE_KEY, p.theme);
      }
      if (isThemeMode(p.theme_mode) && p.theme_mode !== localMode) {
        setModeState(p.theme_mode);
        safeSet(THEME_MODE_STORAGE_KEY, p.theme_mode);
      }
    };

    sync();
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      if (session?.user) sync();
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const persistToProfile = useCallback(
    async (patch: { theme?: ThemeId; theme_mode?: ThemeMode }) => {
      try {
        const { data: userRes } = await supabase.auth.getUser();
        const user = userRes?.user;
        if (!user) return false;
        const { error } = await supabase
          .from("profiles")
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .update(patch as any)
          .eq("user_id", user.id);
        return !error;
      } catch {
        return false;
      }
    },
    [],
  );

  const setTheme = useCallback(
    (t: ThemeId) => {
      setThemeState(t);
      safeSet(THEME_STORAGE_KEY, t);
      // Marcamos dirty antes del intento remoto: si el update falla
      // (offline / sin sesión), el próximo sync hará push.
      safeSet(THEME_DIRTY_KEY, "1");
      persistToProfile({ theme: t }).then((ok) => {
        if (ok) safeDel(THEME_DIRTY_KEY);
      });
    },
    [persistToProfile],
  );

  const setMode = useCallback(
    (m: ThemeMode) => {
      setModeState(m);
      safeSet(THEME_MODE_STORAGE_KEY, m);
      safeSet(THEME_DIRTY_KEY, "1");
      persistToProfile({ theme_mode: m }).then((ok) => {
        if (ok) safeDel(THEME_DIRTY_KEY);
      });
    },
    [persistToProfile],
  );

  const value = useMemo<ThemeCtx>(
    () => ({ theme, mode, resolvedDark, setTheme, setMode }),
    [theme, mode, resolvedDark, setTheme, setMode],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export const useTheme = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error("useTheme must be used within ThemeProvider");
  return v;
};

export const useThemeToggle = () => {
  const { resolvedDark, setMode } = useTheme();
  return {
    isDark: resolvedDark,
    toggle: () => setMode(resolvedDark ? "light" : "dark"),
  };
};
