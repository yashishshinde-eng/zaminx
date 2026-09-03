import { memo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPriceGrouped, formatQty, formatTradeTime } from "@/lib/market-format";
import type { RecentTrade as RecentTradeT } from "@/lib/market-types";

export const RecentTrades = memo(function RecentTrades({
  trades,
  isLoading,
}: {
  trades: RecentTradeT[];
  isLoading: boolean;
}) {
  return (
    <div className="glass-card flex flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-2.5">
        <span className="text-sm font-semibold">Recent Trades</span>
        <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className="size-1.5 animate-pulse rounded-full bg-success" /> live
        </span>
      </div>

      <div className="grid grid-cols-3 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        <span>Price</span>
        <span className="text-right">Amount</span>
        <span className="text-right">Time</span>
      </div>

      <div className="scrollbar-thin max-h-[320px] overflow-y-auto">
        {isLoading && trades.length === 0
          ? Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="mx-4 my-1 h-5 rounded-md" />
            ))
          : trades.map((t) => {
              const isSell = t.isBuyerMaker; // buyer is maker → aggressor was a seller
              return (
                <div
                  key={t.id}
                  className="grid grid-cols-3 px-4 py-[3px] text-xs tabular-nums"
                >
                  <span className={isSell ? "text-destructive" : "text-success"}>
                    {formatPriceGrouped(t.price)}
                  </span>
                  <span className="text-right text-foreground/80">{formatQty(t.quantity)}</span>
                  <span className="text-right text-muted-foreground">{formatTradeTime(t.time)}</span>
                </div>
              );
            })}
        {!isLoading && trades.length === 0 && (
          <div className="px-4 py-6 text-center text-sm text-muted-foreground">No trades yet.</div>
        )}
      </div>
    </div>
  );
});