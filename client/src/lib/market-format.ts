/**
 * Display formatters for market data.
 *
 * Every formatter guards against `NaN`/`null`/`undefined` and returns `"--"`
 * so the UI never renders "NaN" or "undefined". Crypto prices vary widely in
 * magnitude, so `formatPrice` adapts decimal precision to the value.
 */

const DASH = "--";

function isNum(v: number): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

/**
 * Format a crypto price with magnitude-adaptive decimals.
 *  >= 1000 → 2 dp, >= 1 → 4 dp (trimmed), < 1 → 6 dp (trimmed).
 */
export function formatPrice(value: number, fallback = DASH): string {
  if (!isNum(value)) return fallback;
  let decimals: number;
  if (value >= 1000) decimals = 2;
  else if (value >= 1) decimals = 4;
  else decimals = 6;
  const s = value.toFixed(decimals);
  // strip trailing zeros after the decimal point for cleaner display
  return s.includes(".") ? s.replace(/\.?0+$/, "") : s;
}

/** Format a price with thousands separators (used in stat grids / tables). */
export function formatPriceGrouped(value: number, fallback = DASH): string {
  if (!isNum(value)) return fallback;
  let decimals: number;
  if (value >= 1000) decimals = 2;
  else if (value >= 1) decimals = 4;
  else decimals = 6;
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
}

export interface ChangeFormat {
  text: string;
  positive: boolean | null;
}

/** Format a 24h percentage change, e.g. "+1.23%" / "-1.23%". */
export function formatChange(percent: number): ChangeFormat {
  if (!isNum(percent)) return { text: DASH, positive: null };
  const sign = percent > 0 ? "+" : "";
  return { text: `${sign}${percent.toFixed(2)}%`, positive: percent > 0 };
}

/** Compact volume, e.g. 12.3K / 1.1M. Optional asset suffix. */
export function formatVolume(value: number, suffix = "", fallback = DASH): string {
  if (!isNum(value)) return fallback;
  const abs = Math.abs(value);
  let out: string;
  if (abs >= 1e9) out = (value / 1e9).toFixed(2) + "B";
  else if (abs >= 1e6) out = (value / 1e6).toFixed(2) + "M";
  else if (abs >= 1e3) out = (value / 1e3).toFixed(2) + "K";
  else out = value.toFixed(2);
  return suffix ? `${out} ${suffix}` : out;
}

/** Quantity / amount, up to 6 significant digits. */
export function formatQty(value: number, fallback = DASH): string {
  if (!isNum(value)) return fallback;
  if (value === 0) return "0";
  const abs = Math.abs(value);
  if (abs >= 1e6) return value.toExponential(2);
  if (abs >= 1) return value.toFixed(4).replace(/\.?0+$/, "");
  return value.toFixed(6).replace(/\.?0+$/, "");
}

/** Spread between best ask and best bid, formatted as a price. */
export function formatSpread(value: number, fallback = DASH): string {
  return formatPrice(value, fallback);
}

/** Trade time as HH:MM:SS (local). */
export function formatTradeTime(ms: number, fallback = DASH): string {
  if (!isNum(ms) || ms <= 0) return fallback;
  const d = new Date(ms);
  if (isNaN(d.getTime())) return fallback;
  return d.toLocaleTimeString("en-GB", { hour12: false });
}

/** Full date+time for chart tooltips. */
export function formatChartTime(time: number, fallback = DASH): string {
  if (!isNum(time) || time <= 0) return fallback;
  const d = new Date(time * 1000);
  if (isNaN(d.getTime())) return fallback;
  return d.toLocaleString("en-GB", { hour12: false, dateStyle: "short", timeStyle: "medium" });
}