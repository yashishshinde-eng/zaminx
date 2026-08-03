import { useMemo } from "react";
import { Package as PackageIcon } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader, ErrorState, EmptyState } from "@/components/shared";
import { Skeleton } from "@/components/ui/skeleton";
import { PackageTierCard } from "@/components/packages/PackageTierCard";
import { UserPackageList } from "@/components/packages/UserPackageList";
import { PaymentCard } from "@/components/packages/PaymentCard";
import {
  usePackageCatalog,
  useMyPackages,
  useHasOpenPackage,
  useActivatePackage,
} from "@/hooks/usePackages";

export function PackagesPage() {
  const catalog = usePackageCatalog();
  const mine = useMyPackages();
  const hasOpen = useHasOpenPackage();
  const activate = useActivatePackage();

  // The pending subscription awaiting payment (with joined payment info).
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
                  onActivate={(id) => activate.mutate(id)}
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
    </AppShell>
  );
}

export default PackagesPage;