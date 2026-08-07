import { useMemo } from "react";
import Chart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";
import { Users, Activity, Wallet, ArrowDownToLine, Package, UserCheck, TrendingUp } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader, DataTable, type Column } from "@/components/shared";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { themeColor, formatRelative } from "@/lib/chart";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useAdminDashboard } from "@/hooks/useAdmin";
import type { AdminDashboardActivityRow } from "@zeminex/shared";

/** /app/admin — platform-wide admin landing: KPIs, 30-day volume, recent activity. */
export function AdminDashboardPage() {
  const { data, isLoading, isError, refetch } = useAdminDashboard();
  const kpis = data?.kpis;
  const series = data?.series ?? [];
  const recent = data?.recentActivity ?? [];

  return (
    <AppShell>
      <PageHeader
        title="Admin Dashboard"
        description="Platform-wide overview: users, deposit & withdrawal volume, assets under management, and recent audit activity."
        breadcrumbs={[{ label: "Home", to: "/" }, { label: "Dashboard", to: "/app" }, { label: "Admin" }]}
      />

      <div className="mt-6 space-y-6">
        {/* KPI grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {isLoading || !kpis ? (
            Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[88px] w-full rounded-xl" />)
          ) : (
            <>
              <StatTile icon={Users} label="Total users" value={String(kpis.totalUsers)} />
              <StatTile icon={UserCheck} label="Active users" value={String(kpis.byStatus.active)} />
              <StatTile icon={Wallet} label="Assets under management" value={formatCurrency(kpis.aum)} />
              <StatTile icon={ArrowDownToLine} label="Total deposits (paid)" value={formatCurrency(kpis.totalDeposits.sumUsd)} sub={`${kpis.totalDeposits.count} deposits`} />
              <StatTile icon={ArrowDownToLine} label="Total withdrawals (paid)" value={formatCurrency(kpis.totalWithdrawals.sumUsd)} sub={`${kpis.totalWithdrawals.count} withdrawals`} />
              <StatTile icon={Package} label="Active packages" value={String(kpis.activePackages)} sub={`${kpis.sponsors} sponsors`} />
            </>
          )}
        </div>

        {/* User status + withdrawal-by-status chips */}
        {kpis && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Users:</span>
            <Badge variant="success">Active · {kpis.byStatus.active}</Badge>
            <Badge variant="warning">Suspended · {kpis.byStatus.suspended}</Badge>
            <Badge variant="destructive">Banned · {kpis.byStatus.banned}</Badge>
            <span className="ml-3 text-xs font-medium text-muted-foreground">Withdrawals:</span>
            {Object.entries(kpis.totalWithdrawals.byStatus).map(([k, v]) => (
              <Badge key={k} variant="secondary" className="capitalize">
                {k.replace(/_/g, " ")} · {v}
              </Badge>
            ))}
          </div>
        )}

        {/* 30-day deposits-vs-withdrawals chart */}
        <VolumeChart series={series} loading={isLoading} />

        {/* Recent activity */}
        <Card className="border-0">
          <CardHeader className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="size-4 text-primary" /> Recent activity
            </CardTitle>
            <CardDescription>The 10 most recent audit-log entries.</CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={activityColumns}
              data={recent}
              rowKey={(r) => r.id}
              isLoading={isLoading}
              error={isError ? "We couldn't load the dashboard. Please try again." : null}
              onRetry={() => refetch()}
              emptyTitle="No recent activity"
              emptyDescription="Audit events will appear here."
            />
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

/* ------------------------------------------------------------------ */
/*  KPI tile                                                           */
/* ------------------------------------------------------------------ */

function StatTile({ icon: Icon, label, value, sub }: { icon: typeof Users; label: string; value: string; sub?: string }) {
  return (
    <Card className="card-hover card-shimmer overflow-hidden border-0">
      <CardContent className="py-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{label}</p>
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="size-4" />
          </div>
        </div>
        <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
        {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  30-day deposits-vs-withdrawals chart (dual-series)                 */
/* ------------------------------------------------------------------ */

function VolumeChart({ series, loading }: { series: { date: string; deposits: number; withdrawals: number }[]; loading: boolean }) {
  const options: ApexOptions = useMemo(
    () => ({
      chart: { type: "bar", height: 260, toolbar: { show: false }, background: "transparent", fontFamily: "inherit" },
      colors: [themeColor("primary", "hsl(45 100% 48%)"), themeColor("destructive", "hsl(0 84% 60%)")],
      dataLabels: { enabled: false },
      stroke: { curve: "smooth", width: 2 },
      grid: { borderColor: themeColor("border", "hsl(215 30% 16%)"), strokeDashArray: 4 },
      xaxis: {
        categories: series.map((s) => s.date),
        labels: { style: { colors: themeColor("muted-foreground", "hsl(210 16% 55%)") } },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: { labels: { style: { colors: themeColor("muted-foreground", "hsl(210 16% 55%)") }, formatter: (v: number) => formatCurrency(v) } },
      tooltip: { theme: "dark", y: { formatter: (v: number) => formatCurrency(v) } },
      legend: { position: "top", labels: { colors: themeColor("muted-foreground", "hsl(210 16% 55%)") } },
    }),
    [series],
  );
  const chartSeries = [
    { name: "Deposits", data: series.map((s) => s.deposits) },
    { name: "Withdrawals", data: series.map((s) => s.withdrawals) },
  ];
  const hasData = series.length > 0;

  return (
    <Card className="border-0 flex flex-col">
      <CardHeader className="space-y-1">
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="size-4 text-primary" /> Deposits vs withdrawals
        </CardTitle>
        <CardDescription>Paid deposit and withdrawal volume over the last 30 days.</CardDescription>
      </CardHeader>
      <CardContent className="relative flex-1">
        {loading ? (
          <Skeleton className="h-[260px] w-full" />
        ) : hasData ? (
          <Chart options={options} series={chartSeries} type="bar" height={260} />
        ) : (
          <div className="flex h-[260px] flex-col items-center justify-center text-center">
            <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <TrendingUp className="size-5" />
            </div>
            <p className="mt-2 text-sm font-medium">No volume in range</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Activity columns                                                    */
/* ------------------------------------------------------------------ */

const activityColumns: Column<AdminDashboardActivityRow>[] = [
  { key: "createdAt", header: "When", cell: (r) => <span title={formatDate(r.createdAt)}>{formatRelative(r.createdAt)}</span> },
  { key: "actorName", header: "Actor", cell: (r) => (r.actorName ?? "System") },
  { key: "action", header: "Action", cell: (r) => <span className="font-mono text-xs">{r.action}</span> },
];

export default AdminDashboardPage;