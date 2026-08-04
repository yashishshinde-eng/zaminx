import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  subtitle?: string;
  /** Tailwind classes for the icon tile background + text. */
  accent?: string;
  /** Use the brand gradient for the icon tile instead of `accent`. */
  gradient?: boolean;
  className?: string;
}

/** Compact metric tile reused across the dashboard (income + wallet tiles). */
export function StatCard({ icon: Icon, label, value, subtitle, accent, gradient, className }: StatCardProps) {
  return (
    <Card className={cn("premium-kpi overflow-hidden border-0", className)}>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-xl",
              gradient
                ? "gradient-blue text-white shadow-glow-blue"
                : accent ?? "bg-primary/10 text-primary",
            )}
          >
            <Icon className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-muted-foreground">{label}</p>
            <p className="text-lg font-semibold tracking-tight">{value}</p>
          </div>
        </div>
        {subtitle && <p className="mt-3 text-xs text-muted-foreground">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}