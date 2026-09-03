import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import { STORAGE_KEYS } from "@/config";

type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

/**
 * Permanent dark mode.
 *
 * The app is always dark — there is no light theme and no toggle. The
 * `dark` class is forced on <html> for the lifetime of the app and also
 * baked into index.html so it is present before first paint. The
 * `toggleTheme` / `setTheme` functions are kept on the API (as no-ops)
 * so existing callers keep compiling, but they do nothing.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("dark");
    root.classList.remove("light");
    root.style.colorScheme = "dark";
    localStorage.setItem(STORAGE_KEYS.theme, "dark");
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme: "dark",
      toggleTheme: () => undefined,
      setTheme: () => undefined,
    }),
    [],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}