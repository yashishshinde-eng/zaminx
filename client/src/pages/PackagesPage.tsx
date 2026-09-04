import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Package as PackageIcon, ArrowDownToLine, Wallet as WalletIcon } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader, ErrorState, EmptyState } from "@/components/shared";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { PackageTierCard } from "@/components/packages/PackageTierCard";
import { UserPackageList } from "@/components/packages/UserPackageList";
import { PaymentCard } from "@/components/packages/PaymentCard";
import { ActivationSuccessDialog } from "@/components/packages/ActivationSuccessDialog";
import {
  usePackageCatalog,
  useMyPackages,
  useHasOpenPackage,
  useActivatePackage,
} from "@/hooks/usePackages";
import { useWallet } from "@/hooks/useWallet";
import { formatCurrency } from "@/lib/utils";
import type { ActivatePackageResponse } from "@zeminex/shared";

export function PackagesPage() {
  const catalog = usePackageCatalog();
  const mine = useMyPackages();
  const hasOpen = useHasOpenPackage();
  const activate = useActivatePackage();
  const wallet = useWallet();
  const [success, setSuccess] = useState<ActivatePackageResponse | null>(null);

  const mainAvailable = wallet.data?.main.available ?? 0;

  // The pending subscription awaiting payment (with joined payment info).
  // Legacy package-tied pending deposits only — wallet activation is instant.
  const pendingPayment = mine.data?.find((p) => p.status === "pending" && p.payment);

  const disabledReason = hasOpen
    ? "You already have a pending or active package"
    : undefined;

  // Auto-highlight the tier whose price is closest to the catalog median as "Popular".
  const popularId = useMemo(() => {
    const tiers = catalog.data;
    if (!tiers || tiers.length < 2) return null;
    const sorted = [...tiers].sort((a, b) => a.priceUsd - b.priceUsd);
    const median = sorted[Math.floor(sorted.length / 2)].priceUsd;
    let best = sorted[0];
    let bestDist = Infinity;
    for (const t of tiers) {
      const d = Math.abs(t.priceUsd - median);
      if (d < bestDist) {
        bestDist = d;
        best = t;
      }
    }
    return best.id;
  }, [catalog.data]);

  return (
    <AppShell>
      <PageHeader
        title="Packages"
        description="Activation, history & status."
        breadcrumbs={[{ label: "Dashboard", to: "/app" }, { label: "Packages" }]}
      />

      <div className="mt-6 space-y-8">
        {/* Payment required (pending activation) */}
        {pendingPayment && (
          <PaymentCard payment={pendingPayment.payment!} packageName={pendingPayment.snapshot.name} />
        )}

        {/* Wallet balance + deposit entry */}
        <div className="glass-card flex flex-wrap items-center gap-3 p-4">
          <div className="flex size-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue/20 to-blue-dark/10">
            <WalletIcon className="size-4 text-blue-light" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">Main wallet balance</p>
            <p className="font-grotesk text-lg font-bold tabular-nums">
              {wallet.isLoading ? "—" : formatCurrency(mainAvailable)}
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/app/deposit"><ArrowDownToLine className="size-4" /> Deposit</Link>
          </Button>
        </div>

        {/* Catalog */}
        <section className="space-y-4">
          {catalog.isLoading && (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-64" />
              ))}
            </div>
          )}

          {catalog.isError && (
            <ErrorState
              message="We couldn't load the package catalog. Please try again."
              onRetry={() => catalog.refetch()}
            />
          )}

          {catalog.data && catalog.data.length === 0 && (
            <EmptyState
              icon={PackageIcon}
              title="No packages available"
              description="No investment tiers are listed right now. Please check back soon."
            />
          )}

          {catalog.data && catalog.data.length > 0 && (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {catalog.data.map((tier, i) => (
                <PackageTierCard
                  key={tier.id}
                  tier={tier}
                  disabled={hasOpen}
                  disabledReason={disabledReason}
                  loading={activate.isPending}
                  canAfford={mainAvailable >= tier.priceUsd}
                  onActivate={(id) => activate.mutate(id, { onSuccess: (res) => setSuccess(res) })}
                  popular={tier.id === popularId}
                  delay={i * 0.05}
                />
              ))}
            </div>
          )}
        </section>

        {/* Activation history & status */}
        <section>
          {mine.isError ? (
            <ErrorState
              message="We couldn't load your package history. Please try again."
              onRetry={() => mine.refetch()}
            />
          ) : (
            <UserPackageList packages={mine.data} isLoading={mine.isLoading} />
          )}
        </section>
      </div>

      <ActivationSuccessDialog open={!!success} result={success} onClose={() => setSuccess(null)} />
    </AppShell>
  );
}

export default PackagesPage;