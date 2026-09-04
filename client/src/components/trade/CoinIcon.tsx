import { useState } from "react";
import { cn } from "@/lib/utils";
import { coinIcon } from "@/lib/coin-icons";

/** Per-coin gradient used for the fallback badge (no real logo available). */
const PAIR_GRADIENTS: Record<string, string> = {
  BTC: "from-amber-400/30 to-orange-500/20",
  ETH: "from-indigo-400/30 to-purple-500/20",
  BNB: "from-yellow-400/30 to-amber-500/20",
  LTC: "from-slate-300/30 to-slate-400/20",
  ADA: "from-blue-400/30 to-cyan-500/20",
  XRP: "from-cyan-400/30 to-teal-500/20",
  TRX: "from-rose-400/30 to-red-500/20",
};

/**
 * Real coin logo inside a rounded badge. Renders the bundled brand SVG for the
 * base asset; falls back to the colored gradient + ticker letters if the logo
 * is missing or fails to load.
 */
export function CoinIcon({
  base,
  size = 32,
  className,
}: {
  base: string;
  size?: number;
  className?: string;
}) {
  const url = coinIcon(base);
  const [failed, setFailed] = useState(false);
  const showLogo = url && !failed;

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-lg",
        !showLogo && cn("bg-gradient-to-br text-[10px] font-bold", PAIR_GRADIENTS[base] ?? "from-white/10 to-white/5"),
        className,
      )}
      style={{ width: size, height: size }}
    >
      {showLogo ? (
        <img
          src={url}
          alt={`${base} logo`}
          loading="lazy"
          // Drop the broken-image glyph and fall back to the ticker badge.
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
          draggable={false}
        />
      ) : (
        base.slice(0, 2)
      )}
    </div>
  );
}