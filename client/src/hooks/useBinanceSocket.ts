/**
 * Binance combined-stream WebSocket manager.
 *
 * One socket per (url). Frames are routed to caller callbacks held in refs so
 * the socket is not torn down on every render. Handles:
 *   - connection status (connecting / connected / reconnecting / disconnected)
 *   - exponential-backoff auto-reconnect (suppresses reconnect on unmount)
 *   - a stale-data watchdog (force-closes if no message for 20s)
 *   - a generation counter so late messages from a previous stream are dropped
 *
 * Callers register callbacks via the returned setter functions; this hook owns
 * the socket lifecycle.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  Candle,
  ConnectionStatus,
  RecentTrade,
  Ticker24h,
} from "@/lib/market-types";
import {
  parseKlinePayload,
  parseMiniTickerPayload,
  parseTickerPayload,
  parseTradePayload,
} from "@/lib/market-rest";

type KlineCb = (candle: Candle, closed: boolean) => void;
type TickerCb = (ticker: Ticker24h) => void;
type TradeCb = (trade: RecentTrade) => void;

interface BinanceSocketOptions {
  /** Combined-stream URL. When it changes, the socket is rebuilt. */
  url: string;
  /** Symbol this socket belongs to (used to annotate payloads). */
  symbol: string;
  /** If false (or empty url), no socket is opened. */
  enabled?: boolean;
}

interface BinanceSocketResult {
  status: ConnectionStatus;
  onKline: (cb: KlineCb) => void;
  onTicker: (cb: TickerCb) => void;
  onTrade: (cb: TradeCb) => void;
}

const STALE_MS = 20_000;

export function useBinanceSocket({
  url,
  symbol,
  enabled = true,
}: BinanceSocketOptions): BinanceSocketResult {
  const [status, setStatus] = useState<ConnectionStatus>(enabled ? "connecting" : "disconnected");

  // Callbacks held in refs so the socket isn't rebuilt when callers update them.
  const klineCb = useRef<KlineCb | null>(null);
  const tickerCb = useRef<TickerCb | null>(null);
  const tradeCb = useRef<TradeCb | null>(null);

  const onKline = useCallback((cb: KlineCb) => {
    klineCb.current = cb;
  }, []);
  const onTicker = useCallback((cb: TickerCb) => {
    tickerCb.current = cb;
  }, []);
  const onTrade = useCallback((cb: TradeCb) => {
    tradeCb.current = cb;
  }, []);

  useEffect(() => {
    if (!enabled || !url) {
      setStatus("disconnected");
      return;
    }

    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let staleTimer: ReturnType<typeof setInterval> | null = null;
    let closedByUs = false;
    let attempt = 0;
    // Bump on each connect so a late message from a torn-down socket is ignored.
    let generation = 0;

    const clearTimers = () => {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      if (staleTimer) {
        clearInterval(staleTimer);
        staleTimer = null;
      }
    };

    const connect = () => {
      const myGen = ++generation;
      setStatus(attempt === 0 ? "connecting" : "reconnecting");
      let lastMsgAt = Date.now();

      try {
        ws = new WebSocket(url);
      } catch {
        scheduleReconnect();
        return;
      }

      ws.onopen = () => {
        if (myGen !== generation) return;
        attempt = 0;
        lastMsgAt = Date.now();
        setStatus("connected");
        staleTimer = setInterval(() => {
          if (myGen !== generation) return;
          if (Date.now() - lastMsgAt > STALE_MS && ws && ws.readyState === WebSocket.OPEN) {
            // Force close so onclose triggers a reconnect.
            try {
              ws.close();
            } catch {
              /* ignore */
            }
          }
        }, 5_000);
      };

      ws.onmessage = (ev) => {
        if (myGen !== generation) return;
        lastMsgAt = Date.now();
        let frame: { stream?: string; data?: Record<string, unknown> };
        try {
          frame = JSON.parse(ev.data as string);
        } catch {
          return;
        }
        const stream = frame.stream ?? "";
        const data = frame.data ?? {};
        if (stream.includes("@kline")) {
          const { candle, closed } = parseKlinePayload(data);
          klineCb.current?.(candle, closed);
        } else if (stream.includes("@miniTicker")) {
          tickerCb.current?.(parseMiniTickerPayload(data));
        } else if (stream.endsWith("@ticker")) {
          tickerCb.current?.(parseTickerPayload(data));
        } else if (stream.endsWith("@trade")) {
          tradeCb.current?.(parseTradePayload(data));
        }
      };

      ws.onerror = () => {
        // onclose will follow and handle reconnect.
        if (myGen !== generation) return;
        try {
          ws?.close();
        } catch {
          /* ignore */
        }
      };

      ws.onclose = () => {
        if (myGen !== generation) return;
        if (staleTimer) {
          clearInterval(staleTimer);
          staleTimer = null;
        }
        if (closedByUs) {
          setStatus("disconnected");
          return;
        }
        scheduleReconnect();
      };

      function scheduleReconnect() {
        if (myGen !== generation) return;
        setStatus("reconnecting");
        const base = Math.min(1000 * 2 ** attempt, 10_000);
        const jitter = Math.random() * 400;
        const delay = base + jitter;
        attempt += 1;
        reconnectTimer = setTimeout(() => {
          if (myGen !== generation || closedByUs) return;
          connect();
        }, delay);
      }
    };

    connect();

    return () => {
      closedByUs = true;
      clearTimers();
      if (ws) {
        ws.onopen = null;
        ws.onmessage = null;
        ws.onerror = null;
        ws.onclose = null;
        try {
          if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
            ws.close();
          }
        } catch {
          /* ignore */
        }
      }
      setStatus("disconnected");
    };
  }, [url, symbol, enabled]);

  return { status, onKline, onTicker, onTrade };
}