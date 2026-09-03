import { memo } from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { ConnectionBadge } from "./ConnectionBadge";
import { formatChange, formatPriceGrouped, formatVolume } from "@/lib/market-format";
import type { ConnectionStatus, Ticker24h, TradePair } from "@/lib/market-types";

const PAIR_GRADIENTS: Record<string, string> = {
  BTC: "from-amber-400/30 to-orange-500/20",
  ETH: "from-indigo-400/30 to-purple-500/20",
  BNB: "from-yellow-400/30 to-amber-500/20",
  LTC: "from-slate-300/30 to-slate-400/20",
  ADA: "from-blue-400/30 to-cyan-500/20",
  XRP: "from-cyan-400/30 to-teal-500/20",
  TRX: "from-rose-400/30 to-red-500/20",
};

export const MarketList = memo(function MarketList({
  pairs,
  tickers,
  activeSymbol,
  onSelect,
  status,
  isLoading,
}: {
  pairs: TradePair[];
  tickers: Record<string, Ticker24h>;
  activeSymbol: string;
  onSelect: (pair: TradePair) => void;
  status: ConnectionStatus;
  isLoading: boolean;
}) {
  return (
    <div className="glass-card flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-3 py-2.5">
        <span className="text-sm font-semibold">Markets</span>
        <ConnectionBadge status={status} />
      </div>

      <div className="scrollbar-thin flex-1 overflow-y-auto">
        {isLoading && Object.keys(tickers).length === 0
          ? Array.from({ length: pairs.length }).map((_, i) => (
              <Skeleton key={i} className="m-2 h-12 rounded-lg" />
            ))
          : pairs.map((p) => {
              const t = tickers[p.symbol];
              const active = p.symbol === activeSymbol;
              const change = t ? formatChange(t.priceChangePercent) : null;
              return (
                <button
                  key={p.symbol}
                  type="button"
                  onClick={() => onSelect(p)}
                  className={cn(
                    "flex w-full items-center gap-3 border-l-2 px-3 py-2.5 text-left transition-colors",
                    active
                      ? "border-blue bg-blue/10"
                      : "border-transparent hover:bg-white/[0.03]",
                  )}
                >
                  <div
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-[10px] font-bold",
                      PAIR_GRADIENTS[p.base] ?? "from-white/10 to-white/5",
                    )}
                  >
                    {p.base.slice(0, 2)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{p.label}</div>
                    <div className="truncate text-[11px] text-muted-foreground tabular-nums">
                      VOL {t ? formatVolume(t.quoteVolume) : "--"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold tabular-nums">
                      {t ? formatPriceGrouped(t.lastPrice) : "--"}
                    </div>
                    <div
                      className={cn(
                        "text-[11px] font-semibold tabular-nums",
                        change?.positive === null
                          ? "text-muted-foreground"
                          : change?.positive
                            ? "text-success"
                            : "text-destructive",
                      )}
                    >
                      {change?.text ?? "--"}
                    </div>
                  </div>
                </button>
              );
            })}
      </div>
    </div>
  );
});