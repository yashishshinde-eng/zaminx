import { Wallet } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardSummary } from "@zaminex/shared";
import { formatCurrency } from "@/lib/utils";

/** Wallet overview — Main / Bonus / Trading available balances (+ on-hold). */
export function WalletCard({ wallets }: { wallets: DashboardSummary["wallets"] }) {
  const tiles = [
    { label: "Main", balance: wallets.main },
    { label: "Bonus", balance: wallets.bonus },
    { label: "Trading", balance: wallets.trading },
  ];
  const anyOnHold = wallets.totalOnHold > 0;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Wallet className="size-4 text-primary" /> Wallet
          </CardTitle>
          <CardDescription>Across all three wallets</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3">
          {tiles.map((t) => (
            <div key={t.label} className="glass-card card-shimmer p-3 text-center">
              <p className="text-xs font-medium text-muted-foreground">{t.label}</p>
              <p className="mt-1 text-sm font-semibold tabular-nums sm:text-base">{formatCurrency(t.balance.available)}</p>
              {t.balance.onHold > 0 && (
                <p className="mt-0.5 text-[10px] text-muted-foreground">+{formatCurrency(t.balance.onHold)} hold</p>
              )}
            </div>
          ))}
        </div>
        <div className="mt-4 space-y-1 border-t border-white/[0.06] pt-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Available</span>
            <span className="text-base font-semibold tabular-nums text-gradient-gold">{formatCurrency(wallets.totalAvailable)}</span>
          </div>
          {anyOnHold && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">On hold</span>
              <span className="text-sm font-medium tabular-nums text-muted-foreground">{formatCurrency(wallets.totalOnHold)}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}