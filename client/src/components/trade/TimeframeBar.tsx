import { memo } from "react";
import { cn } from "@/lib/utils";
import type { Timeframe, TimeframeOption } from "@/lib/market-types";

export const TimeframeBar = memo(function TimeframeBar({
  timeframes,
  active,
  onChange,
}: {
  timeframes: TimeframeOption[];
  active: Timeframe;
  onChange: (t: Timeframe) => void;
}) {
  return (
    <div className="no-scrollbar flex min-w-0 max-w-full items-center gap-1 overflow-x-auto rounded-xl border border-white/[0.08] bg-white/[0.02] p-1">
      {timeframes.map((tf) => {
        const isActive = tf.value === active;
        return (
          <button
            key={tf.value}
            type="button"
            onClick={() => onChange(tf.value)}
            aria-pressed={isActive}
            className={cn(
              "shrink-0 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all duration-200",
              !isActive && "text-muted-foreground hover:bg-white/[0.06] hover:text-foreground",
            )}
            style={
              isActive
                ? { background: "#18F3CB", color: "#052A22", boxShadow: "0 0 16px -4px rgba(24,243,203,0.6)" }
                : undefined
            }
          >
            {tf.label}
          </button>
        );
      })}
    </div>
  );
});