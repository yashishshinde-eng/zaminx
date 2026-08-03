import { cn } from "@/lib/utils";

interface ProgressProps {
  /** 0–100. Values outside the range are clamped. */
  value: number;
  /** Override the fill colour (e.g. a status accent). Defaults to the brand gradient. */
  indicatorClassName?: string;
  /** Adds an optional animated glow + shimmer for the onboarding hero. */
  glow?: boolean;
  className?: string;
}

/**
 * An accessible progress bar. Uses the brand gradient by default so it pairs
 * with the gold token system. Honours `prefers-reduced-motion` via the global
 * CSS guard (the shimmer animation is nullified there).
 */
export function Progress({ value, indicatorClassName, glow, className }: ProgressProps) {
  const clamped = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped)}
      className={cn("relative h-2.5 w-full overflow-hidden rounded-full bg-muted", className)}
    >
      <div
        className={cn(
          "brand-gradient h-full rounded-full transition-[width] duration-500 ease-out",
          glow && "shadow-[0_0_12px_-1px_hsl(var(--primary)/0.6)]",
          indicatorClassName,
        )}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}