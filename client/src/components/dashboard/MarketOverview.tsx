import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { TrendingUp, TrendingDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Sparkline } from "@/components/dashboard/Sparkline";
import { ConnectionBadge } from "@/components/trade";
import { CoinIcon } from "@/components/trade/CoinIcon";
import { useMarketList } from "@/hooks/useMarketList";
import { fetchKlines } from "@/lib/market-rest";
import { formatChange, formatPrice } from "@/lib/market-format";
import { TRADE_PAIRS, type Ticker24h } from "@/lib/market-types";

/* ═══════════════════════════════════════════════════════════════════════
 *  Live market data — Binance public REST + WebSocket (same feed as the
 *  Trade page, via `useMarketList`). Static values below are only a first
 *  paint while the live feed connects, replaced coin-by-coin as data lands.
 * ═══════════════════════════════════════════════════════════════════════ */

/** Full display name per base asset (Binance symbols only give tickers). */
const COIN_NAME: Record<string, string> = {
  BTC: "Bitcoin",
  ETH: "Ethereum",
  BNB: "BNB",
  LTC: "Litecoin",
  ADA: "Cardano",
  XRP: "XRP",
  TRX: "TRON",
  SOL: "Solana",
  DOGE: "Dogecoin",
  DOT: "Polkadot",
  MATIC: "Polygon",
  AVAX: "Avalanche",
  LINK: "Chainlink",
  SHIB: "Shiba Inu",
};

const PAIR_BY_SYMBOL = Object.fromEntries(TRADE_PAIRS.map((p) => [p.symbol, p]));

/** The 5 coins pinned in the "Trending" row — a fixed, predictable set
 *  (order doesn't jump around as prices move), same coins as the previous
 *  static fallback. */
const TRENDING_SYMBOLS = ["BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "XRPUSDT"];

/** First-paint placeholder — swapped out per-coin the moment live data lands. */
const FALLBACK: Record<string, { price: number; change24h: number; sparkline: number[] }> = {
  BTCUSDT: { price: 67542.3, change24h: 2.45, sparkline: [65200, 65800, 66300, 66900, 67200, 67542] },
  ETHUSDT: { price: 3521.8, change24h: 1.82, sparkline: [3420, 3450, 3480, 3500, 3510, 3521] },
  BNBUSDT: { price: 598.4, change24h: -0.65, sparkline: [602, 600, 599, 598, 597, 598] },
  SOLUSDT: { price: 178.9, change24h: 5.23, sparkline: [168, 170, 173, 175, 177, 178] },
  XRPUSDT: { price: 0.62, change24h: -1.34, sparkline: [0.64, 0.63, 0.62, 0.63, 0.62, 0.62] },
};

interface DisplayCoin {
  symbol: string;
  base: string;
  name: string;
  price: number;
  change24h: number;
  sparkline: number[];
}

function fmtPrice(v: number): string {
  return Number.isFinite(v) ? `$${formatPrice(v)}` : "--";
}

/* ── Entrance animation variants ──────────────────────────────── */
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

/**
 * Market Overview — premium crypto exchange market data panel.
 * Live Binance data: trending coins + top movers, backed by the same
 * public REST + WebSocket feed as the Trade page (no auth, no backend).
 */
export function MarketOverview() {
  const { t } = useTranslation();
  const prefersReduced = useReducedMotion();
  const { tickers, status } = useMarketList();
  const [sparklines, setSparklines] = useState<Record<string, number[]>>({});

  // One-time REST seed of 24h hourly sparklines for every tracked pair —
  // the live ticker stream carries price/% change but not a time series.
  useEffect(() => {
    const controller = new AbortController();
    for (const pair of TRADE_PAIRS) {
      fetchKlines(pair.symbol, "1h", 24, controller.signal)
        .then((candles) => {
          if (controller.signal.aborted) return;
          setSparklines((prev) => ({ ...prev, [pair.symbol]: candles.map((c) => c.close) }));
        })
        .catch(() => undefined);
    }
    return () => controller.abort();
  }, []);

  const toDisplayCoin = (symbol: string, ticker: Ticker24h | undefined): DisplayCoin => {
    const pair = PAIR_BY_SYMBOL[symbol];
    const fallback = FALLBACK[symbol];
    return {
      symbol,
      base: pair.base,
      name: COIN_NAME[pair.base] ?? pair.base,
      price: ticker?.lastPrice ?? fallback?.price ?? NaN,
      change24h: ticker?.priceChangePercent ?? fallback?.change24h ?? NaN,
      sparkline: sparklines[symbol] ?? fallback?.sparkline ?? [],
    };
  };

  const trendingCoins = useMemo(
    () => TRENDING_SYMBOLS.map((symbol) => toDisplayCoin(symbol, tickers[symbol])),
    [tickers, sparklines],
  );

  const topMovers = useMemo(() => {
    const live = Object.values(tickers).filter((tk) => Number.isFinite(tk.priceChangePercent) && PAIR_BY_SYMBOL[tk.symbol]);
    const source = live.length > 0 ? live : TRENDING_SYMBOLS.map((s) => ({ symbol: s, priceChangePercent: FALLBACK[s].change24h }) as Ticker24h);
    return [...source]
      .sort((a, b) => Math.abs(b.priceChangePercent) - Math.abs(a.priceChangePercent))
      .slice(0, 4)
      .map((tk) => toDisplayCoin(tk.symbol, tickers[tk.symbol]));
  }, [tickers, sparklines]);

  return (
    <motion.div
      className="neon-card neon-blue relative p-5 sm:p-6"
      initial="hidden"
      animate="visible"
      variants={prefersReduced ? undefined : containerVariants}
    >
      {/* ── Inner highlight ─────────────────────────────────── */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent rounded-[22px] z-10" />

      {/* ── Title row ────────────────────────────────────────── */}
      <motion.div className="relative z-10 flex items-center gap-3 mb-5" variants={prefersReduced ? undefined : itemVariants}>
        <div
          className="flex size-10 items-center justify-center rounded-[12px]"
          style={{
            background: "rgb(0 167 255 / 0.12)",
            boxShadow: "0 0 14px -3px rgb(0 167 255 / 0.4), inset 0 0 10px -4px rgb(0 167 255 / 0.3)",
            border: "1px solid rgb(0 167 255 / 0.22)",
          }}
        >
          <TrendingUp className="size-4" style={{ color: "#00B7FF", filter: "drop-shadow(0 0 4px rgb(0 167 255 / 0.5))" }} />
        </div>
        <h2 className="section-title">{t("marketOverview.title")}</h2>
        <ConnectionBadge status={status} className="ml-auto" />
      </motion.div>

      {/* ── Trending Coins ───────────────────────────────────── */}
      <motion.div className="relative z-10 mb-6" variants={prefersReduced ? undefined : itemVariants}>
        <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-3">
          {t("marketOverview.trendingCoins")}
        </h3>
        <div className="-mx-5 flex gap-3 overflow-x-auto scroll-smooth px-5 pb-2 sm:-mx-6 sm:px-6 no-scrollbar">
          {trendingCoins.map((coin, i) => {
            const isUp = coin.change24h >= 0;
            return (
              <motion.div
                key={coin.symbol}
                className="glass-card glass-card-hover group flex shrink-0 w-[155px] sm:w-[175px] flex-col gap-2.5 p-3.5 cursor-default"
                variants={prefersReduced ? undefined : itemVariants}
                custom={i}
              >
                {/* Coin avatar + name */}
                <div className="flex items-center gap-2">
                  <CoinIcon base={coin.base} size={32} className="shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-tight truncate">{coin.name}</p>
                    <p className="text-[10px] text-muted-foreground">{coin.base}</p>
                  </div>
                </div>

                {/* Price + 24h change */}
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-bold tabular-nums">{fmtPrice(coin.price)}</p>
                  <span
                    className={`text-[11px] font-semibold tabular-nums ${isUp ? "text-success" : "text-destructive"}`}
                  >
                    {formatChange(coin.change24h).text}
                  </span>
                </div>

                {/* Mini sparkline */}
                <Sparkline
                  data={coin.sparkline}
                  colorVar={isUp ? "success" : "destructive"}
                  fallback={isUp ? "hsl(153 64% 42%)" : "hsl(0 84% 60%)"}
                  height={28}
                />
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* ── Top Movers ────────────────────────────────────────── */}
      <motion.div className="relative z-10 mb-5" variants={prefersReduced ? undefined : itemVariants}>
        <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-3">
          {t("marketOverview.topMovers")}
        </h3>
        <div className="flex flex-col gap-1.5">
          {topMovers.map((coin, i) => {
            const isUp = coin.change24h >= 0;
            return (
              <motion.div
                key={coin.symbol}
                className="premium-transaction-row glass-card-hover"
                variants={prefersReduced ? undefined : itemVariants}
                custom={i}
              >
                <span className="w-5 text-xs text-muted-foreground tabular-nums shrink-0">{i + 1}</span>
                <CoinIcon base={coin.base} size={28} className="shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{coin.name}</p>
                  <p className="text-[11px] text-muted-foreground">{coin.base}</p>
                </div>
                <div className="hidden sm:block w-16 shrink-0">
                  <Sparkline
                    data={coin.sparkline}
                    colorVar={isUp ? "success" : "destructive"}
                    fallback={isUp ? "hsl(153 64% 42%)" : "hsl(0 84% 60%)"}
                    height={24}
                  />
                </div>
                <span className="text-sm font-semibold tabular-nums shrink-0">{fmtPrice(coin.price)}</span>
                <div className="flex items-center gap-1 shrink-0 w-[70px] justify-end">
                  {isUp ? (
                    <TrendingUp className="size-3 text-success" />
                  ) : (
                    <TrendingDown className="size-3 text-destructive" />
                  )}
                  <span
                    className={`text-xs font-semibold tabular-nums ${isUp ? "text-success" : "text-destructive"}`}
                  >
                    {formatChange(coin.change24h).text}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
}
