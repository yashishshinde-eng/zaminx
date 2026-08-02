/**
 * Read a CSS variable (HSL channel triple, e.g. "222 47% 11%") from the
 * document root and return it as an `hsl(...)` string for ApexCharts. Lets the
 * charts follow the light/dark theme without hardcoding colors.
 */
export function themeColor(name: string, fallback: string): string {
  if (typeof document === "undefined") return fallback;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim();
  return raw ? `hsl(${raw})` : fallback;
}

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