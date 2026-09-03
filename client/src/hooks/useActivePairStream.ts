/**
 * Single combined WebSocket for the active trading pair.
 *
 * Wraps `useBinanceSocket` and exposes the latest kline / ticker / trade
 * payloads via **refs** (updated on every WS message, no React state) so
 * downstream hooks (`useCandles`, `useTicker`, `useRecentTrades`) can read them
 * and flush to state on their own throttled cadence. This keeps a single socket
 * per pair/interval while preserving hook separation.
 */

import { useMemo } from "react";
import { useBinanceSocket } from "./useBinanceSocket";
import { buildPairStreamUrl } from "@/lib/market-rest";
import type {
  Candle,
  ConnectionStatus,
  RecentTrade,
  Ticker24h,
} from "@/lib/market-types";

export interface ActivePairStream {
  status: ConnectionStatus;
  /** Latest live (possibly partial) candle. */
  klineRef: React.MutableRefObject<{ candle: Candle; closed: boolean } | null>;
  /** Latest 24h ticker. */
  tickerRef: React.MutableRefObject<Ticker24h | null>;
  /** Latest trade (downstream prepends to a list). */
  tradeRef: React.MutableRefObject<RecentTrade | null>;
}

export function useActivePairStream(
  symbol: string,
  interval: string,
  enabled = true,
): ActivePairStream {
  const url = useMemo(() => buildPairStreamUrl(symbol, interval), [symbol, interval]);
  const { status, onKline, onTicker, onTrade } = useBinanceSocket({ url, symbol, enabled });

  const klineRef = useMemo<ActivePairStream["klineRef"]>(() => ({ current: null }), []);
  const tickerRef = useMemo<ActivePairStream["tickerRef"]>(() => ({ current: null }), []);
  const tradeRef = useMemo<ActivePairStream["tradeRef"]>(() => ({ current: null }), []);

  // Register stable callbacks once that write into the refs.
  onKline((candle, closed) => {
    klineRef.current = { candle, closed };
  });
  onTicker((ticker) => {
    tickerRef.current = ticker;
  });
  onTrade((trade) => {
    tradeRef.current = trade;
  });

  return { status, klineRef, tickerRef, tradeRef };
}