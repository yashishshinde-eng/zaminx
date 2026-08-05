import type { ApexOptions } from "apexcharts";

/**
 * Zaminex — Premium Crypto Exchange Chart Theme System
 *
 * All chart colors follow the brand palette (gold/blue/purple)
 * and respect the light/dark theme via CSS custom properties.
 */

/**
 * Read a CSS variable (HSL channel triple, e.g. "45 100% 48%") from the
 * document root and return it as an `hsl(...)` string for ApexCharts.
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

/** ApexCharts theme-aware defaults for the Zaminex brand. */
export const CHART_THEME = {
  gridBorderColor: "hsl(var(--border))",
  labelColor: "hsl(var(--muted-foreground))",
  tooltipTheme: "dark" as const,
} as const;

/** Premium donut slice palette — brand-aligned crypto colors */
export const DONUT_COLORS = [
  "#f6b400", // Gold — Trading
  "#0d6efd", // Blue — Direct
  "#a855f7", // Purple — Team
  "#10b981", // Emerald — Community
  "#f43f5e", // Rose — Rank
  "#06b6d4", // Cyan — Bonanza
];

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

/**
 * Shared ApexCharts base options for a premium crypto-exchange look.
 * Individual chart components spread this and override as needed.
 */
export function baseChartOptions(height: number = 280): ApexOptions {
  return {
    chart: {
      height,
      toolbar: { show: false },
      background: "transparent",
      fontFamily: 'Space Grotesk, Inter, ui-sans-serif, system-ui, sans-serif',
      animations: {
        enabled: true,
        speed: 600,
        dynamicAnimation: { enabled: true, speed: 400 },
      },
      dropShadow: {
        enabled: true,
        top: 6,
        left: 0,
        blur: 8,
        opacity: 0.25,
        color: "hsl(var(--blue))",
      },
    },
    grid: {
      borderColor: "hsl(var(--border) / 0.3)",
      strokeDashArray: 4,
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: true } },
      padding: { left: 0, right: 0, top: 0, bottom: 0 },
    },
    tooltip: {
      theme: "dark",
      style: { fontSize: "13px", fontFamily: "Space Grotesk, Inter, sans-serif" },
      marker: { show: true },
    },
    xaxis: {
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: {
        style: {
          colors: "hsl(var(--muted-foreground))",
          fontSize: "11px",
          fontWeight: 500,
        },
      },
      crosshairs: {
        show: true,
        stroke: { color: "hsl(var(--blue) / 0.3)", width: 1, dashArray: 4 },
      },
    },
    yaxis: {
      labels: {
        style: { colors: "hsl(var(--muted-foreground))", fontSize: "11px", fontWeight: 500 },
      },
    },
    stroke: { curve: "smooth", width: 2.5, lineCap: "round" },
    dataLabels: { enabled: false },
    markers: {
      size: 0,
      hover: { size: 7, sizeOffset: 3 },
      strokeColors: "hsl(var(--card))",
      strokeWidth: 3,
    },
  };
}