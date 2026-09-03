/**
 * Live market list — 24h tickers for all supported pairs.
 *
 * Owns its own long-lived `@miniTicker`-x7 WebSocket (independent of the active
 * pair) so the list updates regardless of which pair is selected. REST-seeds
 * once on mount, then live updates flush to state on a 1s cadence.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useBinanceSocket } from "./useBinanceSocket";
import { buildMarketListStreamUrl, fetchTickers } from "@/lib/market-rest";
import { TRADE_PAIRS, type ConnectionStatus, type Ticker24h } from "@/lib/market-types";

const SYMBOLS = TRADE_PAIRS.map((p) => p.symbol);

export function useMarketList(): {
  tickers: Record<string, Ticker24h>;
  status: ConnectionStatus;
  isLoading: boolean;
} {
  const [tickers, setTickers] = useState<Record<string, Ticker24h>>({});
  const [isLoading, setIsLoading] = useState(true);
  // Accumulate live updates here; flush to state on an interval.
  const bufferRef = useRef<Record<string, Ticker24h>>({});

  const url = useMemo(() => buildMarketListStreamUrl(SYMBOLS), []);
  const { status, onTicker } = useBinanceSocket({ url, symbol: "MARKET_LIST", enabled: true });

  // REST seed once.
  useEffect(() => {
    const controller = new AbortController();
    fetchTickers(SYMBOLS, controller.signal)
      .then((list) => {
        if (controller.signal.aborted) return;
        const map: Record<string, Ticker24h> = {};
        for (const t of list) map[t.symbol] = t;
        setTickers(map);
        setIsLoading(false);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setIsLoading(false);
      });
    return () => controller.abort();
  }, []);

  // Route live miniTicker updates into the buffer.
  onTicker((t) => {
    if (t.symbol) bufferRef.current[t.symbol] = t;
  });

  // Throttled flush.
  useEffect(() => {
    const id = setInterval(() => {
      const buf = bufferRef.current;
      if (Object.keys(buf).length === 0) return;
      bufferRef.current = {};
      setTickers((prev) => ({ ...prev, ...buf }));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return { tickers, status, isLoading };
}