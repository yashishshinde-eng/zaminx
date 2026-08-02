import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { STORAGE_KEYS } from "@/config";
import { useAuth } from "./AuthContext";
import { updateThemeRequest } from "@/lib/profile";

type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function getInitialTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEYS.theme) as Theme | null;
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);
  const { user, isAuthenticated } = useAuth();
  const syncedUserId = useRef<string | null>(null);

  /** Apply theme to the DOM + localStorage; persist to the account when authenticated. */
  const applyTheme = useCallback(
    (t: Theme, persist: boolean) => {
      setThemeState(t);
      if (persist && isAuthenticated) {
        updateThemeRequest(t).catch(() => undefined);
      }
    },
    [isAuthenticated],
  );

  // Apply DOM class + persist locally on every change.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.style.colorScheme = theme;
    localStorage.setItem(STORAGE_KEYS.theme, theme);
  }, [theme]);

  // On login (user id change), the account is the source of truth for theme.
  // Run once per login, not on every user mutation.
  useEffect(() => {
    if (!user || syncedUserId.current === user.id) return;
    syncedUserId.current = user.id;
    if (user.themePreference && user.themePreference !== theme) {
      applyTheme(user.themePreference, false); // no-op server write (already stored)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Reset the sync tracker on logout so the next login re-applies the account theme.
  useEffect(() => {
    if (!user) syncedUserId.current = null;
  }, [user]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      toggleTheme: () => applyTheme(theme === "dark" ? "light" : "dark", true),
      setTheme: (t) => applyTheme(t, true),
    }),
    [theme, applyTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}