import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, ArrowDownToLine } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn, formatCurrency } from "@/lib/utils";
import type { PackageTier } from "@zeminex/shared";

interface PackageTierCardProps {
  tier: PackageTier;
  disabled?: boolean;
  disabledReason?: string;
  onActivate?: (id: string) => void;
  loading?: boolean;
  /** Whether the user's Main wallet can cover this tier's price. */
  canAfford?: boolean;
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
  canAfford = true,
  popular = false,
  delay = 0,
}: PackageTierCardProps) {
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
              Daily up to{" "}
              <span className={cn("font-medium", popular ? "text-gold" : "text-foreground")}>{tier.dailyReturnPct}%</span>
            </p>
          </div>

          <div className="mt-6 flex-1" />
          <Button
            type="button"
            className={cn("w-full h-11", popular ? "btn-premium" : "")}
            disabled={disabled || loading || !canAfford}
            onClick={() => onActivate?.(tier.id)}
            title={disabled ? disabledReason : !canAfford ? "Insufficient wallet balance — deposit first" : undefined}
          >
            {loading ? "Activating…" : "Activate from wallet"}
          </Button>
          {disabled && disabledReason ? (
            <p className="mt-2 text-center text-xs text-muted-foreground">{disabledReason}</p>
          ) : !canAfford ? (
            <p className="mt-2 flex items-center justify-center gap-1 text-center text-xs text-muted-foreground">
              Insufficient balance —{" "}
              <Link to="/app/deposit" className="inline-flex items-center gap-0.5 font-semibold text-gold hover:underline">
                <ArrowDownToLine className="size-3" /> Deposit
              </Link>
            </p>
          ) : null}
        </CardContent>
      </Card>
    </motion.div>
  );
}