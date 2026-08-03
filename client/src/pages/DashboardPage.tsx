import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  TrendingUp,
  Banknote,
  Wallet as WalletIcon,
  Users,
  Package,
  ArrowDownToLine,
  FileText,
  Link2,
} from "lucide-react";
import toast from "react-hot-toast";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader, ErrorState } from "@/components/shared";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useDashboardSummary } from "@/hooks/useDashboardSummary";
import { staggerContainer, staggerItem } from "@/lib/motion";
import {
  OnboardingBanner,
  KpiCard,
  HeroPortfolioCard,
  TradingBotStatusCard,
  BonanzaProgressCard,
  WalletCard,
  IncomeChartCard,
  IncomeDistributionCard,
  IncomeBreakdown,
  ReferralLinkCard,
  TeamStatsCard,
  RankCard,
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

      {data && !isLoading && !isError && <DashboardContent data={data} />}
    </AppShell>
  );
}

type SummaryData = NonNullable<ReturnType<typeof useDashboardSummary>["data"]>;

function DashboardContent({ data }: { data: SummaryData }) {
  // Earnings trend: % change of last-7d sum vs previous-7d sum (undefined if no data).
  const earnedTrend = (() => {
    const series = data.income.series;
    if (series.length < 2) return undefined;
    const last7 = series.slice(-7).reduce((s, p) => s + p.value, 0);
    const prev7 = series.slice(-14, -7).reduce((s, p) => s + p.value, 0);
    if (prev7 === 0) return undefined;
    return ((last7 - prev7) / prev7) * 100;
  })();

  const quickActions = [
    { label: "Activate package", href: "/app/packages", icon: Package, variant: "default" as const },
    { label: "Withdraw", href: "/app/withdrawals", icon: ArrowDownToLine, variant: "outline" as const },
    { label: "View reports", href: "/app/reports", icon: FileText, variant: "outline" as const },
  ];

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="mt-6 space-y-6">
      {/* Onboarding checklist (auto-hides when all steps are done) */}
      <motion.div variants={staggerItem}>
        <OnboardingBanner />
      </motion.div>

      {/* 1 · Hero Portfolio Card */}
      <motion.div variants={staggerItem}>
        <HeroPortfolioCard data={data} />
      </motion.div>

      {/* Animated KPI counters */}
      <motion.div variants={staggerItem} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard icon={WalletIcon} label="Total balance" value={data.wallets.total} delay={0} />
        <KpiCard
          icon={TrendingUp}
          label="Total earned"
          value={data.income.total}
          series={data.income.series.map((s) => s.value)}
          trend={earnedTrend}
          delay={0.05}
        />
        <KpiCard icon={Banknote} label="Available" value={data.wallets.totalAvailable} delay={0.1} />
        <KpiCard icon={Users} label="Team size" value={data.team.teamCount} format="number" delay={0.15} />
      </motion.div>

      {/* 2 · Wallet Summary   ·   3 · Trading Bot Status */}
      <motion.div variants={staggerItem} className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <WalletCard wallets={data.wallets} />
        </div>
        <TradingBotStatusCard data={data} />
      </motion.div>

      {/* 5 · Portfolio Growth   ·   6 · Income Breakdown */}
      <motion.div variants={staggerItem} className="grid gap-6 lg:grid-cols-2">
        <IncomeChartCard income={data.income} />
        <IncomeDistributionCard income={data.income} />
      </motion.div>

      {/* 4 · Income Cards   ·   10 · Bonanza Progress */}
      <motion.div variants={staggerItem} className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <IncomeBreakdown income={data.income} />
        </div>
        <BonanzaProgressCard data={data} />
      </motion.div>

      {/* 8 · Referral Progress   ·   9 · Rank Progress */}
      <motion.div variants={staggerItem} className="grid gap-6 lg:grid-cols-3">
        <ReferralLinkCard referral={data.referral} />
        <TeamStatsCard team={data.team} />
        <RankCard rank={data.account.rank} />
      </motion.div>

      {/* 11 · Recent Transactions   ·   12 · Announcements */}
      <motion.div variants={staggerItem} className="grid gap-6 lg:grid-cols-2">
        <RecentActivityCard activity={data.recentActivity} />
        <NotificationsCard notifications={data.notifications} />
      </motion.div>

      {/* 13 · Quick Actions */}
      <motion.div variants={staggerItem}>
        <div className="glass rounded-xl p-4 sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Quick actions</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {quickActions.map((a) => (
              <Button key={a.label} asChild variant={a.variant} size="sm">
                <Link to={a.href}>
                  <a.icon className="size-4" /> {a.label}
                </Link>
              </Button>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(data.referral.link).then(
                  () => toast.success("Referral link copied"),
                  () => toast.error("Couldn't copy"),
                );
              }}
            >
              <Link2 className="size-4" /> Copy referral link
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/** Loading skeleton mirroring the dashboard grid. */
function DashboardSkeleton() {
  return (
    <div className="mt-6 space-y-6">
      <Skeleton className="h-56 w-full rounded-xl" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Skeleton className="h-[112px]" />
        <Skeleton className="h-[112px]" />
        <Skeleton className="h-[112px]" />
        <Skeleton className="h-[112px]" />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-40 lg:col-span-2" />
        <Skeleton className="h-40" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-72" />
        <Skeleton className="h-72" />
      </div>
    </div>
  );
}