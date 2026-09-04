/**
 * Technical indicators for the candlestick chart.
 *
 * Pure functions over `Candle[]` returning `{ time, value | null }[]` aligned
 * to the input candles — the exact shape lightweight-charts `LineSeries.setData`
 * expects. Leading values are `null` during the warmup window.
 *
 * Structure is additive: EMA / RSI / MACD / Bollinger / VWAP can be added later
 * as additional exported functions and wired into `IndicatorSpec` lists without
 * touching the chart component.
 */

import type { Candle } from "./market-types";

export interface IndicatorPoint {
  time: number;
  value: number | null;
}

export interface IndicatorSpec {
  key: string;
  label: string;
  /** SMA window length. */
  period: number;
  /** CSS color (HSL token) for the line. */
  color: string;
}

/**
 * MA line colors are bright, high-luminance hex values (not theme tokens) so
 * they stay clearly visible against the chart's dark canvas and remain distinct
 * from the bright green/red candlesticks. Each hue is lightened one step from
 * the base Tailwind shade for dark-background contrast. Paired with the same
 * colors in the IndicatorLegend.
 */
export const MA_SPECS: IndicatorSpec[] = [
  { key: "ma5", label: "MA5", period: 5, color: "#fbbf24" }, // amber-400
  { key: "ma10", label: "MA10", period: 10, color: "#60a5fa" }, // blue-400
  { key: "ma30", label: "MA30", period: 30, color: "#a855f7" }, // purple-400
  { key: "ma60", label: "MA60", period: 60, color: "#22d3ee" }, // cyan-400
];

/** Simple Moving Average over `close`. */
export function sma(candles: Candle[], period: number): IndicatorPoint[] {
  if (period <= 0) return candles.map((c) => ({ time: c.time, value: null }));
  const out: IndicatorPoint[] = new Array(candles.length);
  let sum = 0;
  for (let i = 0; i < candles.length; i++) {
    const close = candles[i].close;
    sum += Number.isFinite(close) ? close : 0;
    if (i >= period) {
      const oldClose = candles[i - period].close;
      sum -= Number.isFinite(oldClose) ? oldClose : 0;
    }
    out[i] = {
      time: candles[i].time,
      value: i >= period - 1 ? sum / period : null,
    };
  }
  return out;
}

/** Exponential Moving Average (reserved for later use). */
export function ema(candles: Candle[], period: number): IndicatorPoint[] {
  if (candles.length === 0 || period <= 0) return candles.map((c) => ({ time: c.time, value: null }));
  const k = 2 / (period + 1);
  const out: IndicatorPoint[] = new Array(candles.length);
  let prev: number | null = null;
  for (let i = 0; i < candles.length; i++) {
    const close = candles[i].close;
    if (!Number.isFinite(close)) {
      out[i] = { time: candles[i].time, value: prev };
      continue;
    }
    if (prev === null) {
      prev = close;
    } else {
      prev = close * k + prev * (1 - k);
    }
    out[i] = { time: candles[i].time, value: i >= period - 1 ? prev : null };
  }
  return out;
}

/** Compute all indicator line series for a candle set. */
export function computeIndicators(
  candles: Candle[],
  specs: IndicatorSpec[] = MA_SPECS,
): Record<string, IndicatorPoint[]> {
  const out: Record<string, IndicatorPoint[]> = {};
  for (const spec of specs) {
    out[spec.key] = sma(candles, spec.period);
  }
  return out;
}

/** Last usable (non-null) value for each indicator — for the legend chips. */
export function latestIndicatorValues(
  candles: Candle[],
  specs: IndicatorSpec[] = MA_SPECS,
): Record<string, number | null> {
  const computed = computeIndicators(candles, specs);
  const out: Record<string, number | null> = {};
  for (const spec of specs) {
    const series = computed[spec.key];
    let val: number | null = null;
    for (let i = series.length - 1; i >= 0; i--) {
      if (series[i].value !== null) {
        val = series[i].value;
        break;
      }
    }
    out[spec.key] = val;
  }
  return out;
}

/* ------------------------------ reserved stubs ------------------------------ */
/* EMA, RSI, MACD, Bollinger Bands, VWAP — not wired into the default MA_SPECS yet.
 * Exported so they can be added to an indicator dropdown later without changing
 * the chart component's series wiring. */
// export function rsi(candles: Candle[], period = 14): IndicatorPoint[] { ... }
// export function macd(candles: Candle[]): { macd: IndicatorPoint[]; signal: IndicatorPoint[] } { ... }
// export function bollinger(candles: Candle[], period = 20, mult = 2) { ... }
// export function vwap(candles: Candle[]): IndicatorPoint[] { ... }