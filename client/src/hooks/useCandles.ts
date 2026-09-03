/**
 * Historical + live candles for the active pair.
 *
 * - REST-hydrates `candles` on (symbol, interval) change (used for indicator
 *   computation and the chart's initial `setData`).
 * - Live kline messages from `useActivePairStream` flow into `liveCandleRef`
 *   (no React state) so the chart can update the last bar via `series.update()`
 *   without re-rendering. When a candle *closes*, it is appended/replaced into
 *   `candles` state so indicators recompute on the new bar.
 */

import { useEffect, useRef, useState } from "react";
import { fetchKlines } from "@/lib/market-rest";
import type { Candle } from "@/lib/market-types";

const MAX_CANDLES = 800;

export function useCandles(
  symbol: string,
  interval: string,
  /** Latest live kline message from the active-pair stream. */
  klineRef: React.MutableRefObject<{ candle: Candle; closed: boolean } | null>,
  enabled = true,
): {
  candles: Candle[];
  isLoading: boolean;
  error: Error | null;
  /** Latest (possibly partial) live candle — read by the chart's rAF loop. */
  liveCandleRef: React.MutableRefObject<Candle | null>;
  refetch: () => void;
} {
  const [candles, setCandles] = useState<Candle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  const liveCandleRef = useRef<Candle | null>(null);
  const appliedClosedTimeRef = useRef<number | null>(null);

  // REST hydration on (symbol, interval, reload) change.
  useEffect(() => {
    if (!enabled || !symbol) return;
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);
    liveCandleRef.current = null;
    appliedClosedTimeRef.current = null;

    fetchKlines(symbol, interval, 500, controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return;
        setCandles(data);
        setIsLoading(false);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err : new Error("Failed to load candles"));
        setIsLoading(false);
      });

    return () => controller.abort();
  }, [symbol, interval, enabled, reloadTick]);

  // Poll the stream ref: mirror the latest partial candle into liveCandleRef,
  // and finalize closed candles into `candles` state.
  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => {
      const msg = klineRef.current;
      if (!msg) return;
      const { candle, closed } = msg;
      if (!Number.isFinite(candle.time)) return;
      liveCandleRef.current = candle;

      if (closed && candle.time !== appliedClosedTimeRef.current) {
        appliedClosedTimeRef.current = candle.time;
        setCandles((prev) => {
          if (prev.length === 0) return [candle];
          const last = prev[prev.length - 1];
          if (last.time === candle.time) {
            const copy = prev.slice();
            copy[copy.length - 1] = candle;
            return copy;
          }
          if (candle.time > last.time) {
            const next = [...prev, candle];
            return next.length > MAX_CANDLES ? next.slice(next.length - MAX_CANDLES) : next;
          }
          return prev; // stale/out-of-order
        });
      }
    }, 400);
    return () => clearInterval(id);
  }, [klineRef, enabled]);

  return { candles, isLoading, error, liveCandleRef, refetch: () => setReloadTick((t) => t + 1) };
}