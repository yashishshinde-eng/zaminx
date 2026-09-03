import { memo } from "react";
import { cn } from "@/lib/utils";
import { formatPriceGrouped } from "@/lib/market-format";
import type { IndicatorSpec } from "@/lib/indicators";

export const IndicatorLegend = memo(function IndicatorLegend({
  specs,
  values,
}: {
  specs: IndicatorSpec[];
  values: Record<string, number | null>;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {specs.map((s) => {
        const v = values[s.key] ?? null;
        return (
          <span
            key={s.key}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.02] px-2.5 py-0.5 text-xs font-semibold tabular-nums"
          >
            <span className="size-2 rounded-full" style={{ backgroundColor: s.color }} />
            <span className="text-muted-foreground">{s.label}</span>
            <span className={cn("text-foreground", v === null && "text-muted-foreground")}>
              {v === null ? "--" : formatPriceGrouped(v)}
            </span>
          </span>
        );
      })}
    </div>
  );
});