import { motion } from "framer-motion";
import { ArrowUpRight, ArrowDownRight, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useCountUp } from "@/hooks/useCountUp";
import { formatCurrency } from "@/lib/utils";
import { Sparkline } from "./Sparkline";

interface KpiCardProps {
  icon: LucideIcon;
  label: string;
  value: number;
  /** Optional sparkline series (e.g. the income time-series). */
  series?: number[];
  /** Signed delta to render as a trend chip. Positive = success, negative = destructive. */
  trend?: number;
  /** Suffix appended to the formatted value (e.g. " members"). */
  format?: "currency" | "number";
  className?: string;
  delay?: number;
}

/**
 * Hero KPI tile: gradient icon, animated count-up value, trend chip, and an
 * optional sparkline. The entrance uses framer-motion so a row of KpiCards can
 * stagger in. Honours reduced-motion via useCountUp + the MotionConfig.
 */
export function KpiCard({ icon: Icon, label, value, series, trend, format = "currency", className, delay = 0 }: KpiCardProps) {
  const animated = useCountUp(value, 900);
  const display = format === "currency" ? formatCurrency(animated) : Math.round(animated).toLocaleString();
  const hasTrend = typeof trend === "number" && Number.isFinite(trend) && trend !== 0;
  const trendPositive = (trend ?? 0) >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay }}
    >
      <Card className={cn("card-hover card-shimmer overflow-hidden border-0", className)}>
        <div className="p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="brand-gradient flex size-10 shrink-0 items-center justify-center rounded-xl text-primary-foreground shadow-glow-gold">
                <Icon className="size-5" />
              </div>
              <p className="truncate text-xs font-medium text-muted-foreground">{label}</p>
            </div>
            {hasTrend && (
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-semibold tabular-nums",
                  trendPositive ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive",
                )}
              >
                {trendPositive ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
                {Math.abs(trend ?? 0).toFixed(1)}%
              </span>
            )}
          </div>
          <p className="mt-3 text-2xl font-bold tracking-tight tabular-nums">{display}</p>
          {series && series.length > 0 && (
            <div className="mt-2">
              <Sparkline data={series} height={40} />
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}