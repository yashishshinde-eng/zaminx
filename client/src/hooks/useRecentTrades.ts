/**
 * Recent executed trades for the active pair.
 * REST-seeds 50 trades, then prepends live `@trade` messages (deduped by id)
 * on a 500ms cadence, capped at 50.
 */

import { useEffect, useRef, useState } from "react";
import { fetchRecentTrades } from "@/lib/market-rest";
import type { RecentTrade } from "@/lib/market-types";

const MAX_TRADES = 50;

export function useRecentTrades(
  symbol: string,
  tradeRef: React.MutableRefObject<RecentTrade | null>,
  enabled = true,
): { trades: RecentTrade[]; isLoading: boolean } {
  const [trades, setTrades] = useState<RecentTrade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // Track ids already in the list to dedupe live messages.
  const seenIds = useRef<Set<number>>(new Set());

  // REST seed on symbol change.
  useEffect(() => {
    if (!enabled || !symbol) return;
    const controller = new AbortController();
    setIsLoading(true);
    seenIds.current = new Set();
    fetchRecentTrades(symbol, MAX_TRADES, controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return;
        // Newest first (Binance returns ascending by time — reverse).
        const sorted = [...data].sort((a, b) => b.time - a.time).slice(0, MAX_TRADES);
        seenIds.current = new Set(sorted.map((t) => t.id));
        setTrades(sorted);
        setIsLoading(false);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setIsLoading(false);
      });
    return () => controller.abort();
  }, [symbol, enabled]);

  // Throttled live prepend.
  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => {
      const next = tradeRef.current;
      if (!next || !Number.isFinite(next.id)) return;
      if (seenIds.current.has(next.id)) return;
      seenIds.current.add(next.id);
      setTrades((prev) => [next, ...prev].slice(0, MAX_TRADES));
    }, 500);
    return () => clearInterval(id);
  }, [tradeRef, enabled]);

  return { trades, isLoading };
}