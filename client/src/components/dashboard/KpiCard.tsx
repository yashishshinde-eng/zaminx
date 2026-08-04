import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCountUp } from "@/hooks/useCountUp";
import { formatCurrency } from "@/lib/utils";
import { Sparkline } from "./Sparkline";

interface KpiCardProps {
  icon: LucideIcon;
  label: string;
  value: number;
  series?: number[];
  trend?: number;
  format?: "currency" | "number";
  className?: string;
  delay?: number;
}

/**
 * Premium KPI tile — cinematic glassmorphism panel with
 * gradient icon circle, animated count-up, trend chip, and
 * overlaid sparkline. Staggered entrance with scale + fade.
 */
export function KpiCard({
  icon: Icon,
  label,
  value,
  series,
  trend,
  format = "currency",
  className,
  delay = 0,
}: KpiCardProps) {
  const animated = useCountUp(value, 900);
  const display =
    format === "currency"
      ? formatCurrency(animated)
      : Math.round(animated).toLocaleString();
  const hasTrend = typeof trend === "number" && Number.isFinite(trend) && trend !== 0;
  const trendPositive = (trend ?? 0) >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay }}
      className={cn("group", className)}
    >
      <div className="glass-card glass-card-hover relative overflow-hidden p-5 sm:p-6">
        {/* ── Inner radial sheen overlay ────────────────── */}
        <div
          className="pointer-events-none absolute inset-0 rounded-[22px]"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 15% 10%, rgba(255,255,255,0.05), transparent 60%)",
          }}
        />

        {/* ── Ambient glow behind icon ─────────────────── */}
        <div
          className="pointer-events-none absolute -top-6 -left-6 size-28 rounded-full opacity-[0.12] blur-2xl transition-opacity duration-500 group-hover:opacity-[0.22]"
          style={{
            background:
              "radial-gradient(circle, hsl(var(--blue) / 0.6), hsl(var(--purple) / 0.4), transparent 70%)",
          }}
        />

        {/* ── Top section: icon + label, trend pill ────── */}
        <div className="relative flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* Gradient icon container */}
            <div className="flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-gradient-to-br from-blue/20 to-purple/20 shadow-[0_0_12px_-2px_hsl(var(--blue)/0.2)]">
              <Icon className="size-[18px] text-gold" strokeWidth={2.2} />
            </div>
            <div>
              <p className="metric-label truncate text-xs font-medium text-muted-foreground">
                {label}
              </p>
            </div>
          </div>

          {/* Trend pill — top-right */}
          {hasTrend && (
            <span
              className={cn(
                "chip",
                trendPositive ? "chip-success" : "chip-destructive",
              )}
            >
              {trendPositive ? (
                <TrendingUp className="size-3" />
              ) : (
                <TrendingDown className="size-3" />
              )}
              {Math.abs(trend ?? 0).toFixed(1)}%
            </span>
          )}
        </div>

        {/* ── Value ─────────────────────────────────────── */}
        <p className="metric-value font-grotesk mt-3">{display}</p>

        {/* ── Sparkline overlay — bottom-right, semi-transparent ── */}
        {series && series.length > 0 && (
          <div className="pointer-events-none absolute bottom-3 right-3 left-[30%] opacity-30 transition-opacity duration-500 group-hover:opacity-45">
            <Sparkline
              data={series}
              height={44}
              colorVar="blue"
              fallback="hsl(220 90% 56%)"
            />
          </div>
        )}
      </div>
    </motion.div>
  );
}