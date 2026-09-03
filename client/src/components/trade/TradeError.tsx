import { AlertTriangle } from "lucide-react";
import { ErrorState } from "@/components/shared";
import { cn } from "@/lib/utils";

/** Hard REST failure with no cached data — offers a retry. */
export function TradeError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="glass-card">
      <ErrorState
        message="Couldn't load live market data from Binance. Check your connection and try again."
        onRetry={onRetry}
      />
    </div>
  );
}

/** WebSocket dropped — keep last good data visible, show an amber banner. */
export function ReconnectingBanner({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg border border-warning/20 bg-warning/10 px-3 py-2 text-xs font-semibold text-warning",
        className,
      )}
    >
      <AlertTriangle className="size-3.5 animate-pulse" />
      Reconnecting to live market data…
    </div>
  );
}