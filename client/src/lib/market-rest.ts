/**
 * Binance public REST helpers for the Trade page.
 *
 * Uses native `fetch` directly against `https://api.binance.com` — these are
 * public market-data endpoints (no auth, CORS-enabled), intentionally kept
 * separate from the app's authenticated `api` axios client.
 *
 * Every numeric field is run through `safeNum` so malformed payloads become
 * `NaN` (which the formatters render as "--") rather than leaking strings
 * into the UI.
 */

import type {
  Candle,
  RecentTrade,
  Ticker24h,
} from "./market-types";

export const REST_BASE = "https://api.binance.com";

/** Parse a value to a finite number, or `NaN` if invalid. */
export function safeNum(v: unknown): number {
  if (v === null || v === undefined || v === "") return NaN;
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

async function getJson(url: string, signal?: AbortSignal): Promise<unknown> {
  const res = await fetch(url, { signal });
  if (!res.ok) {
    throw new Error(`Binance REST ${res.status}: ${res.statusText}`);
  }
  return res.json();
}

/**
 * Fetch historical candles (klines).
 * Binance returns an array of arrays:
 * [openTime, open, high, low, close, volume, closeTime, quoteVolume, trades, ...]
 */
export async function fetchKlines(
  symbol: string,
  interval: string,
  limit = 500,
  signal?: AbortSignal,
): Promise<Candle[]> {
  const url = `${REST_BASE}/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
  const raw = (await getJson(url, signal)) as unknown[][];
  return raw.map((k) => ({
    time: Math.floor(safeNum(k[0]) / 1000),
    open: safeNum(k[1]),
    high: safeNum(k[2]),
    low: safeNum(k[3]),
    close: safeNum(k[4]),
    volume: safeNum(k[5]),
  }));
}

/** 24h rolling ticker for a single symbol. */
export async function fetchTicker24h(
  symbol: string,
  signal?: AbortSignal,
): Promise<Ticker24h> {
  const url = `${REST_BASE}/api/v3/ticker/24hr?symbol=${symbol}`;
  const d = (await getJson(url, signal)) as Record<string, unknown>;
  return {
    symbol: String(d.symbol ?? symbol),
    lastPrice: safeNum(d.lastPrice),
    priceChangePercent: safeNum(d.priceChangePercent),
    highPrice: safeNum(d.highPrice),
    lowPrice: safeNum(d.lowPrice),
    volume: safeNum(d.volume),
    quoteVolume: safeNum(d.quoteVolume),
  };
}

/** 24h tickers for many symbols in a single request. */
export async function fetchTickers(
  symbols: string[],
  signal?: AbortSignal,
): Promise<Ticker24h[]> {
  const symbolsParam = encodeURIComponent(JSON.stringify(symbols));
  const url = `${REST_BASE}/api/v3/ticker/24hr?symbols=${symbolsParam}`;
  const arr = (await getJson(url, signal)) as Record<string, unknown>[];
  return arr.map((d) => ({
    symbol: String(d.symbol ?? ""),
    lastPrice: safeNum(d.lastPrice),
    priceChangePercent: safeNum(d.priceChangePercent),
    highPrice: safeNum(d.highPrice),
    lowPrice: safeNum(d.lowPrice),
    volume: safeNum(d.volume),
    quoteVolume: safeNum(d.quoteVolume),
  }));
}

/** Recent executed trades. */
export async function fetchRecentTrades(
  symbol: string,
  limit = 50,
  signal?: AbortSignal,
): Promise<RecentTrade[]> {
  const url = `${REST_BASE}/api/v3/trades?symbol=${symbol}&limit=${limit}`;
  const arr = (await getJson(url, signal)) as Record<string, unknown>[];
  return arr.map((t) => ({
    id: safeNum(t.id),
    price: safeNum(t.price),
    quantity: safeNum(t.qty),
    time: safeNum(t.time),
    isBuyerMaker: Boolean(t.isBuyerMaker),
  }));
}

/**
 * Build a Binance combined-stream WebSocket URL for the active pair.
 * Streams: kline_<interval>, ticker, trade.
 */
export function buildPairStreamUrl(symbol: string, interval: string): string {
  const s = symbol.toLowerCase();
  const streams = [
    `${s}@kline_${interval}`,
    `${s}@ticker`,
    `${s}@trade`,
  ].join("/");
  return `wss://stream.binance.com:9443/stream?streams=${streams}`;
}

/** Build a combined-stream URL for the market list (miniTicker for all symbols). */
export function buildMarketListStreamUrl(symbols: string[]): string {
  const streams = symbols.map((s) => `${s.toLowerCase()}@miniTicker`).join("/");
  return `wss://stream.binance.com:9443/stream?streams=${streams}`;
}

/* ---------------------------- WS payload parsers ---------------------------- */

/** Map a Binance `@ticker` payload to `Ticker24h`. */
export function parseTickerPayload(d: Record<string, unknown>): Ticker24h {
  return {
    symbol: String(d.s ?? ""),
    lastPrice: safeNum(d.c),
    priceChangePercent: safeNum(d.P),
    highPrice: safeNum(d.h),
    lowPrice: safeNum(d.l),
    volume: safeNum(d.v),
    quoteVolume: safeNum(d.q),
  };
}

/** Map a Binance `@miniTicker` payload (partial) to `Ticker24h`. */
export function parseMiniTickerPayload(d: Record<string, unknown>): Ticker24h {
  return {
    symbol: String(d.s ?? ""),
    lastPrice: safeNum(d.c),
    priceChangePercent: safeNum(d.P),
    highPrice: safeNum(d.h),
    lowPrice: safeNum(d.l),
    volume: safeNum(d.v),
    quoteVolume: safeNum(d.q),
  };
}

/** A live (possibly partial) candle from a `@kline_*` payload. */
export function parseKlinePayload(d: Record<string, unknown>): { candle: Candle; closed: boolean } {
  const k = (d.k ?? {}) as Record<string, unknown>;
  return {
    candle: {
      time: Math.floor(safeNum(k.t) / 1000),
      open: safeNum(k.o),
      high: safeNum(k.h),
      low: safeNum(k.l),
      close: safeNum(k.c),
      volume: safeNum(k.v),
    },
    closed: Boolean(k.x),
  };
}

/** A single trade from a `@trade` payload. */
export function parseTradePayload(d: Record<string, unknown>): RecentTrade {
  return {
    id: safeNum(d.t),
    price: safeNum(d.p),
    quantity: safeNum(d.q),
    time: safeNum(d.T),
    isBuyerMaker: Boolean(d.m),
  };
}