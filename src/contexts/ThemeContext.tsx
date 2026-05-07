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
  THEME_MODE_STORAGE_KEY,
  THEME_STORAGE_KEY,
  ThemeId,
  ThemeMode,
} from "@/lib/themes";

interface ThemeCtx {
  theme: ThemeId;
  mode: ThemeMode;
  resolvedDark: boolean;
  setTheme: (t: ThemeId) => void;
  setMode: (m: ThemeMode) => void;
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

  // Listen to OS dark-mode changes (only matters when mode === 'system')
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener?.("change", handler);
    return () => mq.removeEventListener?.("change", handler);
  }, []);

  const resolvedDark = mode === "dark" || (mode === "system" && systemDark);

  // Apply classes to <html>
  useEffect(() => {
    applyToHtml(theme, resolvedDark);
  }, [theme, resolvedDark]);

  // Hydrate from profile when authenticated
  useEffect(() => {
    let cancelled = false;
    const hydrate = async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const user = userRes?.user;
      if (!user || cancelled) return;
      const { data: prof } = await supabase
        .from("profiles")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .select("theme, theme_mode" as any)
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled || !prof) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const p = prof as any;
      if (isThemeId(p.theme)) {
        setThemeState(p.theme);
        try {
          localStorage.setItem(THEME_STORAGE_KEY, p.theme);
        } catch {
          /* ignore */
        }
      }
      if (isThemeMode(p.theme_mode)) {
        setModeState(p.theme_mode);
        try {
          localStorage.setItem(THEME_MODE_STORAGE_KEY, p.theme_mode);
        } catch {
          /* ignore */
        }
      }
    };
    hydrate();
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      if (session?.user) hydrate();
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
        if (!user) return;
        await supabase
          .from("profiles")
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .update(patch as any)
          .eq("user_id", user.id);
      } catch {
        /* offline / no-op */
      }
    },
    [],
  );

  const setTheme = useCallback(
    (t: ThemeId) => {
      setThemeState(t);
      try {
        localStorage.setItem(THEME_STORAGE_KEY, t);
      } catch {
        /* ignore */
      }
      persistToProfile({ theme: t });
    },
    [persistToProfile],
  );

  const setMode = useCallback(
    (m: ThemeMode) => {
      setModeState(m);
      try {
        localStorage.setItem(THEME_MODE_STORAGE_KEY, m);
      } catch {
        /* ignore */
      }
      persistToProfile({ theme_mode: m });
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

// Compat con el viejo ThemeProvider: expone toggle claro/oscuro.
export const useThemeToggle = () => {
  const { resolvedDark, setMode } = useTheme();
  return {
    isDark: resolvedDark,
    toggle: () => setMode(resolvedDark ? "light" : "dark"),
  };
};
