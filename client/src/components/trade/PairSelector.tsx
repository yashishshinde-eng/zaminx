import { memo } from "react";
import { cn } from "@/lib/utils";
import type { TradePair } from "@/lib/market-types";

export const PairSelector = memo(function PairSelector({
  pairs,
  activeSymbol,
  onSelect,
}: {
  pairs: TradePair[];
  activeSymbol: string;
  onSelect: (pair: TradePair) => void;
}) {
  return (
    <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
      {pairs.map((p) => {
        const active = p.symbol === activeSymbol;
        return (
          <button
            key={p.symbol}
            type="button"
            onClick={() => onSelect(p)}
            aria-pressed={active}
            className={cn(
              "shrink-0 rounded-full border px-4 py-1.5 text-sm font-semibold transition-all duration-200",
              active
                ? "gradient-blue border-transparent text-white shadow-glow-blue"
                : "border-white/[0.08] bg-white/[0.02] text-muted-foreground hover:bg-white/[0.06] hover:text-foreground",
            )}
          >
            {p.label}
          </button>
        );
      })}
    </div>
  );
});