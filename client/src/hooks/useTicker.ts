/**
 * 24h ticker for the active pair.
 * REST-seeds instantly, then flushes the live `tickerRef` from the stream to
 * state on a 1s cadence (24h stats don't need sub-second UI).
 */

import { useEffect, useState } from "react";
import { fetchTicker24h } from "@/lib/market-rest";
import type { Ticker24h } from "@/lib/market-types";

export function useTicker(
  symbol: string,
  tickerRef: React.MutableRefObject<Ticker24h | null>,
  enabled = true,
): { ticker: Ticker24h | null; isLoading: boolean; error: Error | null } {
  const [ticker, setTicker] = useState<Ticker24h | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // REST seed on symbol change.
  useEffect(() => {
    if (!enabled || !symbol) return;
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);
    fetchTicker24h(symbol, controller.signal)
      .then((t) => {
        if (controller.signal.aborted) return;
        setTicker(t);
        setIsLoading(false);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err : new Error("Failed to load ticker"));
        setIsLoading(false);
      });
    return () => controller.abort();
  }, [symbol, enabled]);

  // Throttled live flush.
  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => {
      const next = tickerRef.current;
      if (next && Number.isFinite(next.lastPrice)) setTicker(next);
    }, 1000);
    return () => clearInterval(id);
  }, [tickerRef, enabled]);

  return { ticker, isLoading, error };
}