/**
 * Read a CSS variable (HSL channel triple, e.g. "45 100% 48%") from the
 * document root and return it as an `hsl(...)` string for ApexCharts. Lets the
 * charts follow the light/dark theme without hardcoding colors.
 *
 * Fallbacks use the Zaminex gold/blue brand palette.
 */
export function themeColor(name: string, fallback: string): string {
  if (typeof document === "undefined") return fallback;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim();
  return raw ? `hsl(${raw})` : fallback;
}

/** Brand colors for chart series — gold primary, blue secondary. */
export const CHART_COLORS = {
  primary: "hsl(var(--primary))",
  secondary: "hsl(var(--secondary))",
  gold: "hsl(var(--gold))",
  blue: "hsl(var(--blue))",
  success: "hsl(var(--success))",
  warning: "hsl(var(--warning))",
  destructive: "hsl(var(--destructive))",
  muted: "hsl(var(--muted-foreground))",
  border: "hsl(var(--border))",
} as const;

/** ApexCharts theme-aware defaults for Zaminex gold/blue theme. */
export const CHART_THEME = {
  gridBorderColor: "hsl(var(--border))",
  labelColor: "hsl(var(--muted-foreground))",
  tooltipTheme: "dark" as const,
} as const;

/** Compact relative-time string, e.g. "2m ago", "3h ago", "just now". */
export function formatRelative(input: string | Date): string {
  const d = typeof input === "string" ? new Date(input) : input;
  const diff = Date.now() - d.getTime();
  const sec = Math.round(diff / 1000);
  if (sec < 60) return "just now";
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 30) return `${day}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}