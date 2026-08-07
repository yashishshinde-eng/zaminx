import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  TrendingUp,
  Wallet as WalletIcon,
  Users,
  ArrowDownToLine,
  ArrowUpFromLine,
  Package,
  Repeat,
  ArrowRightLeft,
  Gem,
  Sparkles,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { ErrorState } from "@/components/shared";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardSummary } from "@/hooks/useDashboardSummary";
import { useAuth } from "@/context/AuthContext";
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
  MarketOverview,
  RecentTransactions,
} from "@/components/dashboard";

export function DashboardPage() {
  const { data, isLoading, isError, refetch } = useDashboardSummary();

  return (
    <AppShell>
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

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function DashboardContent({ data }: { data: SummaryData }) {
  const { user } = useAuth();
  const earnedTrend = (() => {
    const series = data.income.series;
    if (series.length < 2) return undefined;
    const last7 = series.slice(-7).reduce((s, p) => s + p.value, 0);
    const prev7 = series.slice(-14, -7).reduce((s, p) => s + p.value, 0);
    if (prev7 === 0) return undefined;
    return ((last7 - prev7) / prev7) * 100;
  })();

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-6">

      {/* ═══ Welcome Greeting ════════════════════════════════ */}
      <motion.div variants={staggerItem}>
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="welcome-greeting text-2xl font-bold tracking-tight sm:text-3xl">
              {greeting()}, {user?.name?.split(" ")[0] ?? "there"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Here&apos;s your portfolio overview for today
            </p>
          </div>
          <div className="hidden items-center gap-1.5 rounded-full bg-gold/10 px-3 py-1.5 sm:flex">
            <Sparkles className="size-3.5 text-gold" />
            <span className="text-xs font-semibold text-gold">
              {data.account.rank.name} Rank
            </span>
          </div>
        </div>
      </motion.div>

      {/* ═══ Onboarding Checklist ════════════════════════════ */}
      <motion.div variants={staggerItem}>
        <OnboardingBanner />
      </motion.div>

      {/* ═══ HERO: Portfolio Card ════════════════════════════ */}
      <motion.div variants={staggerItem}>
        <HeroPortfolioCard data={data} />
      </motion.div>

      {/* ═══ MARKET OVERVIEW ═════════════════════════════════ */}
      <motion.div variants={staggerItem}>
        <MarketOverview />
      </motion.div>

      {/* ═══ KPI ROW: 4 Premium Metric Tiles ══════════════ */}
      <motion.div variants={staggerItem} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard icon={WalletIcon} label="Total Balance" value={data.wallets.total} delay={0} />
        <KpiCard
          icon={TrendingUp}
          label="Total Earned"
          value={data.income.total}
          series={data.income.series.map((s) => s.value)}
          trend={earnedTrend}
          delay={0.06}
        />
        <KpiCard icon={ArrowDownToLine} label="Available" value={data.wallets.totalAvailable} delay={0.12} />
        <KpiCard icon={Users} label="Team Size" value={data.team.teamCount} format="number" delay={0.18} />
      </motion.div>

      {/* ═══ CHARTS: Portfolio Performance + Asset Allocation ═ */}
      {/* <motion.div variants={staggerItem} className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <IncomeChartCard income={data.income} />
        <IncomeDistributionCard income={data.income} />
      </motion.div> */}

      {/* ═══ QUICK ACTIONS ═════════════════════════════════ */}
      <motion.div variants={staggerItem}>
        <div className="glass-card relative overflow-hidden p-5 sm:p-6">
          {/* Inner highlight */}
          <div className="pointer-events-none absolute inset-0 rounded-[22px] border-b border-white/[0.06]" />
          <p className="metric-label mb-4 font-grotesk text-xs font-bold uppercase tracking-[0.2em]">Quick Actions</p>
          <div className="grid grid-cols-4 gap-3 sm:grid-cols-4 lg:grid-cols-8">
            <QuickAction icon={ArrowDownToLine} label="Deposit" to="/app/packages" gradient="from-blue/20 to-blue-dark/10" iconColor="text-blue-light" />
            <QuickAction icon={ArrowUpFromLine} label="Withdraw" to="/app/withdrawals" gradient="from-gold/20 to-gold-dark/10" iconColor="text-gold" />
            <QuickAction icon={Package} label="Invest" to="/app/packages" gradient="from-purple/20 to-purple-dark/10" iconColor="text-purple-light" />
            <QuickAction icon={Repeat} label="P2P" to="/app/p2p" gradient="from-success/20 to-success/10" iconColor="text-success" />
            <QuickAction icon={ArrowRightLeft} label="Convert" to="/app/p2p" gradient="from-blue/20 to-blue-dark/10" iconColor="text-blue-light" />
            <QuickAction icon={Gem} label="Stake" to="/app/packages" gradient="from-gold/20 to-gold-dark/10" iconColor="text-gold" />
            <QuickAction icon={TrendingUp} label="Trade" to="/app/packages" gradient="from-purple/20 to-purple-dark/10" iconColor="text-purple-light" />
            <QuickAction icon={Users} label="Refer" to="/app/team" gradient="from-success/20 to-success/10" iconColor="text-success" />
          </div>
        </div>
      </motion.div>

      {/* ═══ INCOME BREAKDOWN + WALLET ══════════════════════ */}
      <motion.div variants={staggerItem} className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <IncomeBreakdown income={data.income} />
        </div>
        <WalletCard wallets={data.wallets} />
      </motion.div>

      {/* ═══ BOT STATUS + BONANZA ═══════════════════════════ */}
      <motion.div variants={staggerItem} className="grid gap-4 sm:grid-cols-2">
        <TradingBotStatusCard data={data} />
        <BonanzaProgressCard data={data} />
      </motion.div>

      {/* ═══ RECENT TRANSACTIONS + TEAM + RANK ══════════════ */}
      <motion.div variants={staggerItem} className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RecentTransactions activity={data.recentActivity} />
        </div>
        <div className="space-y-4">
          <TeamStatsCard team={data.team} />
          <RankCard rank={data.account.rank} />
        </div>
      </motion.div>

      {/* ═══ REFERRAL + NOTIFICATIONS ══════════════════════ */}
      <motion.div variants={staggerItem} className="grid gap-4 lg:grid-cols-2">
        <ReferralLinkCard referral={data.referral} />
        <NotificationsCard notifications={data.notifications} />
      </motion.div>

    </motion.div>
  );
}

/* ─── Quick Action ──────────────────────────────────────── */
function QuickAction({ icon: Icon, label, to, gradient, iconColor }: { icon: typeof ArrowDownToLine; label: string; to: string; gradient: string; iconColor: string }) {
  return (
    <Link to={to} className="premium-action-btn group">
      <div className={`action-icon-lg bg-gradient-to-br ${gradient}`}>
        <Icon className={`size-5 ${iconColor}`} />
      </div>
      <span className="text-xs font-semibold">{label}</span>
    </Link>
  );
}

/* ─── Loading Skeleton ────────────────────────────────────── */
function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-64 rounded-[14px]" />
        <Skeleton className="h-4 w-48 rounded-[14px]" />
      </div>
      {/* Hero */}
      <Skeleton className="h-64 w-full rounded-[22px]" />
      {/* KPI Row */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[130px] rounded-[22px]" />
        ))}
      </div>
      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <Skeleton className="h-80 rounded-[22px]" />
        <Skeleton className="h-80 rounded-[22px]" />
      </div>
      {/* Quick Actions */}
      <Skeleton className="h-40 rounded-[22px]" />
      {/* Income + Wallet */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-72 lg:col-span-2 rounded-[22px]" />
        <Skeleton className="h-72 rounded-[22px]" />
      </div>
      {/* Market + Bot */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-64 lg:col-span-2 rounded-[22px]" />
        <div className="space-y-4">
          <Skeleton className="h-32 rounded-[22px]" />
          <Skeleton className="h-32 rounded-[22px]" />
        </div>
      </div>
      {/* Transactions + Team/Rank */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-64 lg:col-span-2 rounded-[22px]" />
        <div className="space-y-4">
          <Skeleton className="h-32 rounded-[22px]" />
          <Skeleton className="h-32 rounded-[22px]" />
        </div>
      </div>
      {/* Referral + Notifications */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-40 rounded-[22px]" />
        <Skeleton className="h-40 rounded-[22px]" />
      </div>
    </div>
  );
}