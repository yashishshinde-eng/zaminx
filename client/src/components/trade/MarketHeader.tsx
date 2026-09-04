import { memo } from "react";
import { cn } from "@/lib/utils";
import { ConnectionBadge } from "./ConnectionBadge";
import { CoinIcon } from "./CoinIcon";
import { formatChange, formatPriceGrouped, formatVolume } from "@/lib/market-format";
import type { ConnectionStatus, Ticker24h, TradePair } from "@/lib/market-types";

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="space-y-1">
      <div className="metric-label">{label}</div>
      <div className={cn("text-sm font-semibold tabular-nums", accent)}>{value}</div>
    </div>
  );
}

export const MarketHeader = memo(function MarketHeader({
  pair,
  ticker,
  status,
  dimmed,
}: {
  pair: TradePair;
  ticker: Ticker24h | null;
  status: ConnectionStatus;
  dimmed?: boolean;
}) {
  const price = ticker?.lastPrice ?? NaN;
  const change = ticker ? formatChange(ticker.priceChangePercent) : null;
  const up = change?.positive ?? null;

  return (
    <div className={cn("glass-card p-4 sm:p-5", dimmed && "opacity-70")}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        {/* Pair + price */}
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <CoinIcon base={pair.base} size={36} className="ring-1 ring-white/[0.06]" />
            <h2 className="text-gradient-gold font-grotesk text-xl font-bold tracking-tight sm:text-2xl">
              {pair.label}
            </h2>
            <ConnectionBadge status={status} />
          </div>
          <div className="flex items-end gap-3">
            <span
              className={cn(
                "metric-value-lg",
                Number.isFinite(price) ? (up === false ? "text-destructive" : "text-foreground") : "text-muted-foreground",
              )}
            >
              {formatPriceGrouped(price)}
            </span>
            {change && (
              <span
                className={cn(
                  "mb-1 text-sm font-bold tabular-nums",
                  up === null ? "text-muted-foreground" : up ? "text-success" : "text-destructive",
                )}
              >
                {change.text}
              </span>
            )}
          </div>
        </div>

        {/* 24h stats */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 lg:grid-cols-5">
          <Stat label="24h High" value={ticker ? formatPriceGrouped(ticker.highPrice) : "--"} />
          <Stat label="24h Low" value={ticker ? formatPriceGrouped(ticker.lowPrice) : "--"} />
          <Stat
            label={`24h Vol (${pair.base})`}
            value={ticker ? formatVolume(ticker.volume, pair.base) : "--"}
          />
          <Stat
            label="24h Quote"
            value={ticker ? formatVolume(ticker.quoteVolume, pair.quote) : "--"}
          />
          <Stat
            label="Change"
            value={change?.text ?? "--"}
            accent={
              up === null ? "text-muted-foreground" : up ? "text-success" : "text-destructive"
            }
          />
        </div>
      </div>
    </div>
  );
});