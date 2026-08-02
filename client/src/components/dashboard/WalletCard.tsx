import { Wallet } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { DashboardSummary } from "@zaminex/shared";
import { formatCurrency } from "@/lib/utils";

/** Wallet overview — main / bonus / trading balances. All zero until Phase 8. */
export function WalletCard({ wallets }: { wallets: DashboardSummary["wallets"] }) {
  const tiles = [
    { label: "Main", value: wallets.main },
    { label: "Bonus", value: wallets.bonus },
    { label: "Trading", value: wallets.trading },
  ];

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Wallet className="size-4 text-primary" /> Wallet
          </CardTitle>
          <CardDescription>Across all three wallets</CardDescription>
        </div>
        <Badge variant="outline">Phase 8</Badge>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3">
          {tiles.map((t) => (
            <div key={t.label} className="rounded-lg border bg-muted/30 p-3 text-center">
              <p className="text-xs font-medium text-muted-foreground">{t.label}</p>
              <p className="mt-1 text-sm font-semibold tabular-nums sm:text-base">{formatCurrency(t.value)}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between border-t pt-3">
          <span className="text-sm text-muted-foreground">Total balance</span>
          <span className="text-base font-semibold tabular-nums">{formatCurrency(wallets.total)}</span>
        </div>
      </CardContent>
    </Card>
  );
}