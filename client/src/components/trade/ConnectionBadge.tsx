import { memo } from "react";
import { cn } from "@/lib/utils";
import type { ConnectionStatus } from "@/lib/market-types";

const CONFIG: Record<
  ConnectionStatus,
  { label: string; chip: string; dot: string; pulse: boolean }
> = {
  connected: { label: "Live", chip: "chip-success", dot: "bg-success", pulse: true },
  connecting: { label: "Connecting", chip: "chip-warning", dot: "bg-warning", pulse: true },
  reconnecting: { label: "Reconnecting", chip: "chip-warning", dot: "bg-warning", pulse: true },
  disconnected: { label: "Offline", chip: "chip-destructive", dot: "bg-destructive", pulse: false },
};

export const ConnectionBadge = memo(function ConnectionBadge({
  status,
  className,
}: {
  status: ConnectionStatus;
  className?: string;
}) {
  const cfg = CONFIG[status];
  return (
    <span className={cn(cfg.chip, className)} aria-label={`Market data: ${cfg.label}`}>
      <span className="relative flex size-1.5">
        {cfg.pulse && (
          <span
            className={cn(
              "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
              cfg.dot,
            )}
          />
        )}
        <span className={cn("relative inline-flex size-1.5 rounded-full", cfg.dot)} />
      </span>
      {cfg.label}
    </span>
  );
});