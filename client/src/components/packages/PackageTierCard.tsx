import { motion } from "framer-motion";
import { Check, Sparkles, TrendingUp, CalendarDays } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn, formatCurrency, durationLabel } from "@/lib/utils";
import type { PackageTier } from "@zeminex/shared";

interface PackageTierCardProps {
  tier: PackageTier;
  disabled?: boolean;
  disabledReason?: string;
  onActivate?: (id: string) => void;
  loading?: boolean;
  /** Highlight this tier as the most popular (gradient + ribbon). */
  popular?: boolean;
  delay?: number;
}

/**
 * Premium package tier card with glass effect, gradient accent, and popular highlight.
 */
export function PackageTierCard({
  tier,
  disabled,
  disabledReason,
  onActivate,
  loading,
  popular = false,
  delay = 0,
}: PackageTierCardProps) {
  const isLifetime = tier.durationDays === 0;
  // For lifetime packages, project 30-day yield; for fixed-term, project full-term yield.
  const projectedDays = isLifetime ? 30 : tier.durationDays;
  const projectedReturn = tier.priceUsd * (tier.dailyReturnPct / 100) * projectedDays;
  const totalAtMaturity = tier.priceUsd + projectedReturn;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay }}
      className="h-full"
    >
      <Card
        className={cn(
          "relative flex h-full flex-col overflow-hidden transition-all duration-300",
          popular ? "border-blue/30 ring-2 ring-blue/20 shadow-glow-blue" : "card-hover",
        )}
      >
        {/* Gradient header strip */}
        <div className={cn("h-1.5 w-full rounded-t-[20px]", popular ? "gradient-blue" : "bg-white/[0.06]")} />

        {popular && (
          <div className="absolute right-4 top-4 z-10">
            <span className="chip-gradient inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold shadow-glow-blue">
              <Sparkles className="size-3" /> Popular
            </span>
          </div>
        )}

        <CardHeader className={cn(popular && "pt-10")}>
          <CardTitle className="font-grotesk text-base font-semibold">{tier.name}</CardTitle>
          {tier.description && <CardDescription>{tier.description}</CardDescription>}
        </CardHeader>
        <CardContent className="flex flex-1 flex-col">
          <div className="space-y-1">
            <p className={cn("font-grotesk text-3xl font-bold tracking-tight", popular && "text-gradient-gold")}>
              {formatCurrency(tier.priceUsd)}
            </p>
            <p className="text-sm text-muted-foreground">
              <span className={cn("font-medium", popular ? "text-gold" : "text-foreground")}>{tier.dailyReturnPct}%</span> daily ·{" "}
              <span className="font-medium text-foreground">365-day</span> term
            </p>
          </div>

          {/* ROI block */}
          <div className="mt-4 grid grid-cols-2 gap-3 rounded-[14px] border border-white/[0.06] bg-white/[0.02] p-3 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <div className="icon-box size-8 rounded-lg bg-success/10 text-success">
                <TrendingUp className="size-4" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">{isLifetime ? "30-Day yield" : "Projected"}</p>
                <p className="text-sm font-semibold tabular-nums">{formatCurrency(projectedReturn)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="icon-box size-8 rounded-lg bg-gold/10 text-gold">
                <CalendarDays className="size-4" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">{isLifetime ? "Monthly" : "At maturity"}</p>
                <p className="text-sm font-semibold tabular-nums">{formatCurrency(totalAtMaturity)}</p>
              </div>
            </div>
          </div>

          {tier.features.length > 0 && (
            <ul className="mt-4 space-y-2">
              {tier.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm">
                  <Check className={cn("mt-0.5 size-4 shrink-0", popular ? "text-gold" : "text-success")} aria-hidden />
                  <span className="text-muted-foreground">{f}</span>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-6 flex-1" />
          <Button
            type="button"
            className={cn("w-full h-11", popular ? "btn-premium" : "")}
            disabled={disabled || loading}
            onClick={() => onActivate?.(tier.id)}
            title={disabled ? disabledReason : undefined}
          >
            {loading ? "Starting…" : "Activate"}
          </Button>
          {disabled && disabledReason && (
            <p className="mt-2 text-center text-xs text-muted-foreground">{disabledReason}</p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}