/**
 * Client-side market-data types for the Trade page.
 *
 * The Trade page is a display-only live market dashboard. All data comes from
 * Binance's public REST + WebSocket streams (no auth, no backend). These types
 * are intentionally kept client-side — there is no `shared/` or server counterpart.
 */

export interface TradePair {
  /** Binance symbol, e.g. "BTCUSDT" */
  symbol: string;
  /** Base asset, e.g. "BTC" */
  base: string;
  /** Quote asset, e.g. "USDT" */
  quote: string;
  /** Display label, e.g. "BTC/USDT" */
  label: string;
}

/** The seven trading pairs shown on the Trade page. */
export const TRADE_PAIRS: TradePair[] = [
  { symbol: "BTCUSDT", base: "BTC", quote: "USDT", label: "BTC/USDT" },
  { symbol: "ETHUSDT", base: "ETH", quote: "USDT", label: "ETH/USDT" },
  { symbol: "BNBUSDT", base: "BNB", quote: "USDT", label: "BNB/USDT" },
  { symbol: "LTCUSDT", base: "LTC", quote: "USDT", label: "LTC/USDT" },
  { symbol: "ADAUSDT", base: "ADA", quote: "USDT", label: "ADA/USDT" },
  { symbol: "XRPUSDT", base: "XRP", quote: "USDT", label: "XRP/USDT" },
  { symbol: "TRXUSDT", base: "TRX", quote: "USDT", label: "TRX/USDT" },
];

export type Timeframe = "1m" | "5m" | "15m" | "30m" | "1h" | "4h" | "1d" | "1w";

export interface TimeframeOption {
  value: Timeframe;
  label: string;
}

export const TIMEFRAMES: TimeframeOption[] = [
  { value: "1m", label: "1m" },
  { value: "5m", label: "5m" },
  { value: "15m", label: "15m" },
  { value: "30m", label: "30m" },
  { value: "1h", label: "1H" },
  { value: "4h", label: "4H" },
  { value: "1d", label: "1D" },
  { value: "1w", label: "1W" },
];

export const DEFAULT_TIMEFRAME: Timeframe = "15m";

/**
 * A single OHLCV candle. `time` is in **seconds** (lightweight-charts expects
 * seconds for time-based charts; Binance returns ms which we floor/1000).
 */
export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/** 24h rolling ticker statistics for a symbol. */
export interface Ticker24h {
  symbol: string;
  lastPrice: number;
  priceChangePercent: number;
  highPrice: number;
  lowPrice: number;
  /** 24h base-asset volume (e.g. BTC traded). */
  volume: number;
  /** 24h quote-asset volume (e.g. USDT notional). */
  quoteVolume: number;
}

export interface RecentTrade {
  id: number;
  price: number;
  quantity: number;
  /** Trade time in ms. */
  time: number;
  /** True when the buyer is the maker (i.e. a sell-side aggressor). */
  isBuyerMaker: boolean;
}

export type ConnectionStatus = "connecting" | "connected" | "disconnected" | "reconnecting";

/** Map a Binance kline interval to our Timeframe (and vice-versa is identity). */
export const TIMEFRAME_TO_BINANCE: Record<Timeframe, string> = {
  "1m": "1m",
  "5m": "5m",
  "15m": "15m",
  "30m": "30m",
  "1h": "1h",
  "4h": "4h",
  "1d": "1d",
  "1w": "1w",
};