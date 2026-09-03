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
    <div className="no-scrollbar inline-flex items-center gap-1 overflow-x-auto rounded-xl border border-white/[0.08] bg-white/[0.02] p-1">
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
              isActive
                ? "gradient-blue text-white shadow-glow-blue"
                : "text-muted-foreground hover:bg-white/[0.06] hover:text-foreground",
            )}
          >
            {tf.label}
          </button>
        );
      })}
    </div>
  );
});