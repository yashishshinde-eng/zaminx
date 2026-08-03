import { Link } from "react-router-dom";
import { Gift, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCountUp } from "@/hooks/useCountUp";
import { formatCurrency } from "@/lib/utils";
import type { DashboardSummary } from "@zaminex/shared";

/**
 * Blueprint section 10 — Bonanza Progress. The dashboard summary carries no
 * live bonanza-target/progress data, so this card stays honest: it shows the
 * real total bonanza income the user has earned and links to the full Bonanza
 * page where active offers + progress live. No fabricated progress bars.
 */
export function BonanzaProgressCard({ data }: { data: DashboardSummary }) {
  const earned = useCountUp(data.income.bonanza, 1000);

  return (
    <Card className="card-hover flex h-full flex-col overflow-hidden">
      <CardContent className="flex h-full flex-col p-5">
        <div className="flex items-center gap-3">
          <div className="brand-gradient flex size-10 shrink-0 items-center justify-center rounded-lg text-primary-foreground shadow-sm">
            <Gift className="size-5" />
          </div>
          <div>
            <p className="text-sm font-semibold">Bonanza</p>
            <p className="text-xs text-muted-foreground">Bonus offers</p>
          </div>
        </div>

        <div className="mt-4">
          <p className="text-xs font-medium text-muted-foreground">Bonanza earned</p>
          <p className="mt-1 text-2xl font-bold tracking-tight tabular-nums">{formatCurrency(earned)}</p>
        </div>

        <div className="mt-auto pt-4">
          <Button asChild variant="outline" size="sm" className="w-full">
            <Link to="/app/bonanzas">
              View offers <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}