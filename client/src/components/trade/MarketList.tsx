import { memo } from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { ConnectionBadge } from "./ConnectionBadge";
import { CoinIcon } from "./CoinIcon";
import { formatChange, formatPriceGrouped, formatVolume } from "@/lib/market-format";
import type { ConnectionStatus, Ticker24h, TradePair } from "@/lib/market-types";

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
                  <CoinIcon base={p.base} size={32} className="shrink-0 ring-1 ring-white/[0.06]" />
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