import { AppShell } from "@/components/layout/AppShell";
import { PageHeader, ErrorState } from "@/components/shared";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardSummary } from "@/hooks/useDashboardSummary";
import {
  AccountSummaryCard,
  ReferralLinkCard,
  WalletCard,
  PackageCard,
  RankCard,
  IncomeBreakdown,
  IncomeChartCard,
  IncomeDistributionCard,
  NotificationsCard,
  RecentActivityCard,
} from "@/components/dashboard";

export function DashboardPage() {
  const { data, isLoading, isError, refetch } = useDashboardSummary();

  return (
    <AppShell>
      <PageHeader
        title="Dashboard"
        description="Your investment overview at a glance."
        breadcrumbs={[{ label: "Home", to: "/" }, { label: "Dashboard" }]}
      />

      {isLoading && <DashboardSkeleton />}

      {isError && (
        <div className="mt-6">
          <ErrorState message="We couldn't load your dashboard. Please try again." onRetry={() => refetch()} />
        </div>
      )}

      {data && !isLoading && !isError && (
        <div className="mt-6 space-y-6">
          {/* Top row: account summary + referral link */}
          <div className="grid gap-6 lg:grid-cols-2">
            <AccountSummaryCard account={data.account} />
            <ReferralLinkCard referral={data.referral} />
          </div>

          {/* Wallet + package + rank */}
          <div className="grid gap-6 lg:grid-cols-3">
            <WalletCard wallets={data.wallets} />
            <PackageCard pkg={data.package} />
            <RankCard rank={data.account.rank} />
          </div>

          {/* Income breakdown */}
          <IncomeBreakdown income={data.income} />

          {/* Charts */}
          <div className="grid gap-6 lg:grid-cols-2">
            <IncomeChartCard income={data.income} />
            <IncomeDistributionCard income={data.income} />
          </div>

          {/* Notifications + recent activity */}
          <div className="grid gap-6 lg:grid-cols-2">
            <NotificationsCard notifications={data.notifications} />
            <RecentActivityCard activity={data.recentActivity} />
          </div>
        </div>
      )}
    </AppShell>
  );
}

/** Loading skeleton mirroring the dashboard grid. */
function DashboardSkeleton() {
  return (
    <div className="mt-6 space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
      <Skeleton className="h-56" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-72" />
        <Skeleton className="h-72" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    </div>
  );
}