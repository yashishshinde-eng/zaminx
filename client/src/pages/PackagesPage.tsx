import { AppShell } from "@/components/layout/AppShell";
import { PageHeader, ErrorState } from "@/components/shared";
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
            <p className="text-sm text-muted-foreground">
              No packages are available right now. Please check back later.
            </p>
          )}

          {catalog.data && catalog.data.length > 0 && (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {catalog.data.map((tier) => (
                <PackageTierCard
                  key={tier.id}
                  tier={tier}
                  disabled={hasOpen}
                  disabledReason={disabledReason}
                  loading={activate.isPending}
                  onActivate={(id) => activate.mutate(id)}
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