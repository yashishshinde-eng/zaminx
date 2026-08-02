import { useMemo, useState } from "react";
import Chart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";
import { Download, FileSpreadsheet, Printer, TrendingUp } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader, DataTable, type Column } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useReport } from "@/hooks/useReports";
import { downloadReport } from "@/lib/reports";
import { themeColor } from "@/lib/chart";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import toast from "react-hot-toast";
import type {
  UserReportKind,
  ReportQuery,
  DepositRow,
  WithdrawalRow,
  WalletTxRow,
  DepositStatus,
  WithdrawalStatus,
} from "@zaminex/shared";

const LIMIT = 20;

/** Blueprint order: Deposits, Withdrawals, Wallet, then the 6 income streams. */
const TABS: { kind: UserReportKind; label: string }[] = [
  { kind: "deposits", label: "Deposits" },
  { kind: "withdrawals", label: "Withdrawals" },
  { kind: "wallet", label: "Wallet" },
  { kind: "trading", label: "Trading" },
  { kind: "direct", label: "Direct" },
  { kind: "team", label: "Team" },
  { kind: "community", label: "Community" },
  { kind: "rank", label: "Rank" },
  { kind: "bonanza", label: "Bonanza" },
];

const DEPOSIT_STATUSES: DepositStatus[] = ["pending", "paid", "expired", "failed"];
const WITHDRAWAL_STATUSES: WithdrawalStatus[] = [
  "pending",
  "under_review",
  "approved",
  "rejected",
  "paid",
  "cancelled",
];

/** /app/reports — per-user reports with filters, summary + chart, table, export. */
export function ReportsPage() {
  const [kind, setKind] = useState<UserReportKind>("deposits");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState<"" | "csv" | "xls">("");

  // Applied filters drive the query; the form fields commit on Apply.
  const params: ReportQuery = {
    from: from || undefined,
    to: to || undefined,
    status: status || undefined,
    q: q || undefined,
    page,
    limit: LIMIT,
  };

  const { data, isLoading, isError, refetch } = useReport(kind, params);
  const report = data;
  const rows = (report?.rows ?? []) as DepositRow[] | WithdrawalRow[] | WalletTxRow[];
  const summary = report?.summary;
  const pagination = report?.pagination;

  const statusOptions = kind === "deposits" ? DEPOSIT_STATUSES : kind === "withdrawals" ? WITHDRAWAL_STATUSES : [];

  /** Reset to page 1 whenever the active kind changes (status filter may not apply). */
  function selectKind(next: UserReportKind) {
    setKind(next);
    setStatus("");
    setPage(1);
  }

  function applyFilters() {
    setPage(1);
    void refetch();
  }

  function clearFilters() {
    setFrom("");
    setTo("");
    setStatus("");
    setQ("");
    setPage(1);
  }

  async function exportReport(format: "csv" | "xls") {
    setExporting(format);
    try {
      await downloadReport(kind, { from: from || undefined, to: to || undefined, status: status || undefined, q: q || undefined, format });
      toast.success(`${format.toUpperCase()} export ready.`);
    } catch {
      /* axios interceptor toasts the error */
    } finally {
      setExporting("");
    }
  }

  return (
    <AppShell>
      <PageHeader
        title="Reports"
        description="Your deposits, withdrawals, wallet ledger, and income streams — with CSV / Excel / Print export."
        breadcrumbs={[{ label: "Home", to: "/" }, { label: "Dashboard", to: "/app" }, { label: "Reports" }]}
      />

      <div className="mt-6 space-y-6">
        {/* Tabs */}
        <div className="flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t.kind}
              type="button"
              onClick={() => selectKind(t.kind)}
              className={cn(
                "rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
                t.kind === kind
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card hover:bg-accent hover:text-accent-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">From</label>
              <Input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} className="h-9 w-[150px]" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">To</label>
              <Input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} className="h-9 w-[150px]" />
            </div>
            {statusOptions.length > 0 && (
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="h-9 w-[150px] rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">All</option>
                  {statusOptions.map((s) => (
                    <option key={s} value={s}>
                      {s.replace("_", " ")}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Search</label>
              <Input
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && applyFilters()}
                placeholder={kind === "withdrawals" ? "Address" : "Memo"}
                className="h-9 w-[200px]"
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={applyFilters}>
                Apply
              </Button>
              <Button size="sm" variant="outline" onClick={clearFilters}>
                Clear
              </Button>
            </div>
            <div className="sm:ml-auto flex gap-2">
              <Button size="sm" variant="outline" disabled={exporting !== ""} onClick={() => exportReport("csv")}>
                <Download className="size-4" /> {exporting === "csv" ? "…" : "CSV"}
              </Button>
              <Button size="sm" variant="outline" disabled={exporting !== ""} onClick={() => exportReport("xls")}>
                <FileSpreadsheet className="size-4" /> {exporting === "xls" ? "…" : "Excel"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => window.print()}>
                <Printer className="size-4" /> Print
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Summary + chart */}
        <div className="grid gap-6 lg:grid-cols-3">
          <StatCard label="Records" value={summary ? String(summary.count) : "—"} />
          <StatCard label="Total" value={summary ? formatCurrency(summary.total) : "—"} />
          <ReportChart kind={kind} series={summary?.series ?? []} />
        </div>

        {/* Table */}
        <DataTable
          columns={columnsFor(kind)}
          data={rows}
          rowKey={(r) => r.id}
          isLoading={isLoading}
          error={isError ? "We couldn't load this report. Please try again." : null}
          onRetry={() => refetch()}
          emptyTitle="No records in this report"
          emptyDescription="Try widening the date range or clearing the filters."
          page={pagination?.page ?? 1}
          pageCount={pagination?.totalPages ?? 1}
          onPageChange={setPage}
        />
      </div>
    </AppShell>
  );
}

/* ------------------------------------------------------------------ */
/*  Summary cards + chart                                              */
/* ------------------------------------------------------------------ */

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="py-4">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}

function ReportChart({ kind, series }: { kind: UserReportKind; series: { date: string; value: number }[] }) {
  const hasData = series.length > 0;
  const options: ApexOptions = useMemo(
    () => ({
      chart: { type: "area", height: 200, toolbar: { show: false }, background: "transparent", fontFamily: "inherit" },
      colors: [themeColor("primary", "hsl(222 47% 45%)")],
      stroke: { curve: "smooth", width: 2 },
      dataLabels: { enabled: false },
      grid: { borderColor: themeColor("border", "hsl(214 32% 91%)"), strokeDashArray: 4 },
      xaxis: {
        categories: series.map((s) => s.date),
        labels: { style: { colors: themeColor("muted-foreground", "#64748b") } },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: { labels: { style: { colors: themeColor("muted-foreground", "#64748b") }, formatter: (v: number) => formatCurrency(v) } },
      fill: { type: "gradient", gradient: { shadeIntensity: 1, opacityFrom: 0.35, opacityTo: 0.05, stops: [0, 100] } },
      tooltip: { theme: "light", y: { formatter: (v: number) => formatCurrency(v) } },
    }),
    [series],
  );
  const chartSeries = [{ name: labelFor(kind), data: series.map((s) => s.value) }];

  return (
    <Card className="flex flex-col">
      <CardHeader className="space-y-1">
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="size-4 text-primary" /> {labelFor(kind)} over time
        </CardTitle>
        <CardDescription>Daily total</CardDescription>
      </CardHeader>
      <CardContent className="relative flex-1">
        {hasData ? (
          <Chart options={options} series={chartSeries} type="area" height={200} />
        ) : (
          <div className="flex h-[200px] flex-col items-center justify-center text-center">
            <div className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <TrendingUp className="size-5" />
            </div>
            <p className="mt-2 text-sm font-medium">No data in range</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Columns per kind                                                   */
/* ------------------------------------------------------------------ */

function labelFor(kind: UserReportKind): string {
  return TABS.find((t) => t.kind === kind)?.label ?? kind;
}

function statusBadge(status: string) {
  const variant =
    status === "paid" || status === "approved"
      ? "success"
      : status === "pending" || status === "under_review"
        ? "warning"
        : status === "rejected" || status === "failed" || status === "cancelled" || status === "expired"
          ? "destructive"
          : "secondary";
  return (
    <Badge variant={variant} className="capitalize">
      {status.replace("_", " ")}
    </Badge>
  );
}

function columnsFor(kind: UserReportKind): Column<DepositRow | WithdrawalRow | WalletTxRow>[] {
  if (kind === "deposits") {
    return [
      { key: "createdAt", header: "Date", cell: (r) => formatDate((r as DepositRow).createdAt) },
      { key: "amount", header: "Amount", align: "right", cell: (r) => formatCurrency((r as DepositRow).amountUsd) },
      { key: "currency", header: "Currency", cell: (r) => (r as DepositRow).currency },
      { key: "status", header: "Status", cell: (r) => statusBadge((r as DepositRow).status) },
      { key: "paidAt", header: "Paid at", cell: (r) => formatDate((r as DepositRow).paidAt) },
    ];
  }
  if (kind === "withdrawals") {
    return [
      { key: "createdAt", header: "Date", cell: (r) => formatDate((r as WithdrawalRow).createdAt) },
      { key: "wallet", header: "Wallet", cell: (r) => <span className="capitalize">{(r as WithdrawalRow).wallet}</span> },
      { key: "amount", header: "Amount", align: "right", cell: (r) => formatCurrency((r as WithdrawalRow).amount) },
      { key: "address", header: "Address", cell: (r) => <span className="font-mono text-xs">{(r as WithdrawalRow).address}</span> },
      { key: "status", header: "Status", cell: (r) => statusBadge((r as WithdrawalRow).status) },
      { key: "processedAt", header: "Processed at", cell: (r) => formatDate((r as WithdrawalRow).processedAt) },
    ];
  }
  // Ledger kinds (wallet + 6 income streams).
  return [
    { key: "createdAt", header: "Date", cell: (r) => formatDate((r as WalletTxRow).createdAt) },
    { key: "wallet", header: "Wallet", cell: (r) => <span className="capitalize">{(r as WalletTxRow).wallet}</span> },
    { key: "type", header: "Type", cell: (r) => <span className="capitalize">{(r as WalletTxRow).type.replace(/_/g, " ")}</span> },
    {
      key: "direction",
      header: "Direction",
      cell: (r) => (
        <Badge variant={(r as WalletTxRow).direction === "credit" ? "success" : "destructive"} className="capitalize">
          {(r as WalletTxRow).direction}
        </Badge>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      align: "right",
      cell: (r) => {
        const tx = r as WalletTxRow;
        return (
          <span className={cn("tabular-nums", tx.direction === "credit" ? "text-success" : "text-destructive")}>
            {tx.direction === "credit" ? "+" : "−"}
            {formatCurrency(tx.amount)}
          </span>
        );
      },
    },
    { key: "memo", header: "Memo", cell: (r) => (r as WalletTxRow).memo ?? "—" },
  ];
}

export default ReportsPage;