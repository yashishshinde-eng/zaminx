import { Check } from "lucide-react";
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
}

/** A single catalog tier — price, return, duration, features, and an activate CTA. */
export function PackageTierCard({
  tier,
  disabled,
  disabledReason,
  onActivate,
  loading,
}: PackageTierCardProps) {
  return (
    <Card className="flex h-full flex-col">
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

        {tier.features.length > 0 && (
          <ul className="mt-4 space-y-2">
            {tier.features.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm">
                <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                <span className="text-muted-foreground">{f}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-6 flex-1" />
        <Button
          type="button"
          className="w-full"
          disabled={disabled || loading}
          onClick={() => onActivate?.(tier.id)}
          title={disabled ? disabledReason : undefined}
        >
          {loading ? "Starting…" : "Activate"}
        </Button>
        {disabled && disabledReason && (
          <p className={cn("mt-2 text-center text-xs text-muted-foreground")}>{disabledReason}</p>
        )}
      </CardContent>
    </Card>
  );
}