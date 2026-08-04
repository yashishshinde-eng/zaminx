import { motion, useReducedMotion } from "framer-motion";
import { TrendingUp, TrendingDown, Sparkles } from "lucide-react";
import { Sparkline } from "@/components/dashboard/Sparkline";
import { formatCurrency } from "@/lib/utils";

/* ═══════════════════════════════════════════════════════════════════════
 *  Static fallback data — used when no real market API is available.
 *  Mirrors the same fallback pattern used by HeroPortfolioCard.
 * ═══════════════════════════════════════════════════════════════════════ */
const FALLBACK_COINS = [
  { id: "btc", name: "Bitcoin", symbol: "BTC", price: 67542.3, change24h: 2.45, sparkline: [65200, 65800, 66300, 66900, 67200, 67542] },
  { id: "eth", name: "Ethereum", symbol: "ETH", price: 3521.8, change24h: 1.82, sparkline: [3420, 3450, 3480, 3500, 3510, 3521] },
  { id: "bnb", name: "BNB", symbol: "BNB", price: 598.4, change24h: -0.65, sparkline: [602, 600, 599, 598, 597, 598] },
  { id: "sol", name: "Solana", symbol: "SOL", price: 178.9, change24h: 5.23, sparkline: [168, 170, 173, 175, 177, 178] },
  { id: "xrp", name: "XRP", symbol: "XRP", price: 0.62, change24h: -1.34, sparkline: [0.64, 0.63, 0.62, 0.63, 0.62, 0.62] },
];

const topMovers = [...FALLBACK_COINS].sort((a, b) => Math.abs(b.change24h) - Math.abs(a.change24h)).slice(0, 4);

/* ── Coin avatar gradients ────────────────────────────────────── */
const COIN_GRADIENTS: Record<string, string> = {
  btc: "from-amber-400 to-orange-500",
  eth: "from-blue-400 to-indigo-500",
  bnb: "from-yellow-300 to-amber-500",
  sol: "from-purple-400 to-fuchsia-500",
  xrp: "from-gray-300 to-slate-500",
};

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
 * Shows trending coins, top movers, and watchlist empty state.
 */
export function MarketOverview() {
  const prefersReduced = useReducedMotion();

  return (
    <motion.div
      className="glass-card relative p-5 sm:p-6"
      initial="hidden"
      animate="visible"
      variants={prefersReduced ? undefined : containerVariants}
    >
      {/* ── Inner highlight ─────────────────────────────────── */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent rounded-[22px]" />

      {/* ── Title row ────────────────────────────────────────── */}
      <motion.div className="flex items-center gap-3 mb-5" variants={prefersReduced ? undefined : itemVariants}>
        <div className="icon-box-blue">
          <TrendingUp className="size-4 text-blue" />
        </div>
        <h2 className="section-title">Market Overview</h2>
      </motion.div>

      {/* ── Trending Coins ───────────────────────────────────── */}
      <motion.div className="mb-6" variants={prefersReduced ? undefined : itemVariants}>
        <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-3">
          Trending Coins
        </h3>
        <div className="-mx-5 flex gap-3 overflow-x-auto scroll-smooth px-5 pb-2 sm:-mx-6 sm:px-6 no-scrollbar">
          {FALLBACK_COINS.map((coin, i) => {
            const isUp = coin.change24h >= 0;
            const gradient = COIN_GRADIENTS[coin.id] ?? "from-gray-400 to-gray-600";
            return (
              <motion.div
                key={coin.id}
                className="glass-card glass-card-hover group flex shrink-0 w-[155px] sm:w-[175px] flex-col gap-2.5 p-3.5 cursor-default"
                variants={prefersReduced ? undefined : itemVariants}
                custom={i}
              >
                {/* Coin avatar + name */}
                <div className="flex items-center gap-2">
                  <div
                    className={`flex size-8 items-center justify-center rounded-full bg-gradient-to-br ${gradient} text-[11px] font-bold text-white shadow-sm shrink-0`}
                  >
                    {coin.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-tight truncate">{coin.name}</p>
                    <p className="text-[10px] text-muted-foreground">{coin.symbol}</p>
                  </div>
                </div>

                {/* Price + 24h change */}
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-bold tabular-nums">{formatCurrency(coin.price)}</p>
                  <span
                    className={`text-[11px] font-semibold tabular-nums ${isUp ? "text-success" : "text-destructive"}`}
                  >
                    {isUp ? "+" : ""}{coin.change24h.toFixed(2)}%
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
      <motion.div className="mb-5" variants={prefersReduced ? undefined : itemVariants}>
        <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-3">
          Top Movers
        </h3>
        <div className="flex flex-col gap-1.5">
          {topMovers.map((coin, i) => {
            const isUp = coin.change24h >= 0;
            return (
              <motion.div
                key={coin.id}
                className="premium-transaction-row glass-card-hover"
                variants={prefersReduced ? undefined : itemVariants}
                custom={i}
              >
                <span className="w-5 text-xs text-muted-foreground tabular-nums shrink-0">{i + 1}</span>
                <div
                  className={`flex size-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${
                    COIN_GRADIENTS[coin.id] ?? "from-gray-400 to-gray-600"
                  } text-[10px] font-bold text-white`}
                >
                  {coin.name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{coin.name}</p>
                  <p className="text-[11px] text-muted-foreground">{coin.symbol}</p>
                </div>
                <div className="hidden sm:block w-16 shrink-0">
                  <Sparkline
                    data={coin.sparkline}
                    colorVar={isUp ? "success" : "destructive"}
                    fallback={isUp ? "hsl(153 64% 42%)" : "hsl(0 84% 60%)"}
                    height={24}
                  />
                </div>
                <span className="text-sm font-semibold tabular-nums shrink-0">{formatCurrency(coin.price)}</span>
                <div className="flex items-center gap-1 shrink-0 w-[70px] justify-end">
                  {isUp ? (
                    <TrendingUp className="size-3 text-success" />
                  ) : (
                    <TrendingDown className="size-3 text-destructive" />
                  )}
                  <span
                    className={`text-xs font-semibold tabular-nums ${isUp ? "text-success" : "text-destructive"}`}
                  >
                    {isUp ? "+" : ""}{coin.change24h.toFixed(2)}%
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* ── Watchlist empty state ──────────────────────────────── */}
      <motion.div
        className="flex flex-col items-center justify-center gap-3 rounded-[16px] border border-dashed border-white/[0.08] bg-white/[0.02] py-8"
        variants={prefersReduced ? undefined : itemVariants}
      >
        <div className="flex size-10 items-center justify-center rounded-full bg-muted/50">
          <Sparkles className="size-5 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-muted-foreground">Add coins to your watchlist</p>
        <p className="text-xs text-muted-foreground/60">Track your favorite assets in one place</p>
      </motion.div>
    </motion.div>
  );
}