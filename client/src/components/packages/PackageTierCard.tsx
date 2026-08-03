import { motion } from "framer-motion";
import { Check, Sparkles, TrendingUp, CalendarDays } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn, formatCurrency } from "@/lib/utils";
import type { PackageTier } from "@zaminex/shared";

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
 * A single catalog tier — price, projected return, duration, features, and an
 * activate CTA. The "popular" tier gets a gradient ring, a ribbon, and a lifted
 * entrance so the recommended option stands out.
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
  // Projected gross return over the term (simple, non-compounding, as the plan
  // describes): price × daily% × days.
  const projectedReturn = tier.priceUsd * (tier.dailyReturnPct / 100) * tier.durationDays;
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
          "relative flex h-full flex-col overflow-hidden transition-all duration-200",
          popular ? "border-primary/50 ring-2 ring-primary/30 shadow-lg" : "card-hover",
        )}
      >
        {/* Gradient header strip */}
        <div className={cn("h-1.5 w-full", popular ? "brand-gradient" : "bg-border/60")} />

        {popular && (
          <div className="absolute right-4 top-4">
            <span className="brand-gradient inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold text-primary-foreground shadow-sm">
              <Sparkles className="size-3" /> Popular
            </span>
          </div>
        )}

        <CardHeader>
          <CardTitle className="text-base">{tier.name}</CardTitle>
          {tier.description && <CardDescription>{tier.description}</CardDescription>}
        </CardHeader>
        <CardContent className="flex flex-1 flex-col">
          <div className="space-y-1">
            <p className="text-3xl font-bold tracking-tight">{formatCurrency(tier.priceUsd)}</p>
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{tier.dailyReturnPct}%</span> daily ·{" "}
              <span className="font-medium text-foreground">{tier.durationDays}</span>-day term
            </p>
          </div>

          {/* ROI block */}
          <div className="mt-4 grid grid-cols-2 gap-3 rounded-lg border border-border/60 bg-muted/30 p-3">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-md bg-success/10 text-success">
                <TrendingUp className="size-4" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">Projected</p>
                <p className="text-sm font-semibold tabular-nums">{formatCurrency(projectedReturn)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                <CalendarDays className="size-4" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">At maturity</p>
                <p className="text-sm font-semibold tabular-nums">{formatCurrency(totalAtMaturity)}</p>
              </div>
            </div>
          </div>

          {tier.features.length > 0 && (
            <ul className="mt-4 space-y-2">
              {tier.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm">
                  <Check className={cn("mt-0.5 size-4 shrink-0", popular ? "text-primary" : "text-success")} aria-hidden />
                  <span className="text-muted-foreground">{f}</span>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-6 flex-1" />
          <Button
            type="button"
            className={cn("w-full", popular ? "" : "")}
            variant={popular ? "default" : "default"}
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