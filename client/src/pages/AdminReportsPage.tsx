import { useState } from "react";
import { Download, FileSpreadsheet, Printer } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader, DataTable, type Column } from "@/components/shared";
import { StatCard, ReportChartCard } from "@/components/reports";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAdminReport } from "@/hooks/useReports";
import { downloadAdminReport } from "@/lib/reports";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import toast from "react-hot-toast";
import type {
  AdminReportKind,
  ReportQuery,
  AdminReportPayload,
  AdminReportSummary,
  AdminUserReportRow,
  AdminDepositReportRow,
  AdminWithdrawalReportRow,
  AdminIncomeReportRow,
  AdminWalletReportRow,
  AdminGatewayReportRow,
  AdminBonanzaReportRow,
  AdminActivityReportRow,
  DepositStatus,
  WithdrawalStatus,
} from "@zeminex/shared";

const LIMIT = 20;

/** Blueprint order: Users, Deposits, Withdrawals, Income, Wallet, Gateway, Bonanza, Activity. */
const TABS: { kind: AdminReportKind; label: string }[] = [
  { kind: "users", label: "Users" },
  { kind: "deposits", label: "Deposits" },
  { kind: "withdrawals", label: "Withdrawals" },
  { kind: "income", label: "Income" },
  { kind: "wallet", label: "Wallet" },
  { kind: "gateway", label: "Gateway" },
  { kind: "bonanza", label: "Bonanza" },
  { kind: "activity", label: "Activity" },
];

const USER_STATUSES = ["active", "inactive", "blocked"];
const DEPOSIT_STATUSES: DepositStatus[] = ["pending", "paid", "expired", "failed"];
const WITHDRAWAL_STATUSES: WithdrawalStatus[] = [
  "pending",
  "under_review",
  "approved",
  "rejected",
  "paid",
  "cancelled",
];

/** Kinds whose `summary.total` is a monetary amount (shown as a Total stat card). */
const MONETARY: AdminReportKind[] = ["deposits", "withdrawals", "income", "wallet", "gateway", "bonanza"];

type AdminRow =
  | AdminUserReportRow
  | AdminDepositReportRow
  | AdminWithdrawalReportRow
  | AdminIncomeReportRow
  | AdminWalletReportRow
  | AdminGatewayReportRow
  | AdminBonanzaReportRow
  | AdminActivityReportRow;

function labelFor(kind: AdminReportKind): string {
  return TABS.find((t) => t.kind === kind)?.label ?? kind;
}

function statusOptions(kind: AdminReportKind): string[] {
  if (kind === "users") return USER_STATUSES;
  if (kind === "deposits" || kind === "gateway") return DEPOSIT_STATUSES;
  if (kind === "withdrawals") return WITHDRAWAL_STATUSES;
  return [];
}

function qPlaceholder(kind: AdminReportKind): string {
  switch (kind) {
    case "users":
      return "Name, email or code";
    case "withdrawals":
      return "Address";
    case "income":
    case "wallet":
    case "bonanza":
      return "Memo";
    case "gateway":
      return "Invoice ID";
    case "activity":
      return "Action";
    default:
      return "";
  }
}

function statusBadge(status: string) {
  const variant =
    status === "paid" || status === "approved" || status === "active"
      ? "success"
      : status === "pending" || status === "under_review"
        ? "warning"
        : status === "rejected" || status === "failed" || status === "cancelled" || status === "expired" || status === "blocked"
          ? "destructive"
          : "secondary";
  return (
    <Badge variant={variant} className="capitalize">
      {status.replace(/_/g, " ")}
    </Badge>
  );
}

/** /app/admin/reports — platform-wide admin reports with filters, summary, chart, table, export. */
export function AdminReportsPage() {
  const [kind, setKind] = useState<AdminReportKind>("users");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState<"" | "csv" | "xls">("");

  // Applied filters drive the query; the form fields commit on Apply.
  const params: ReportQuery = {
    from: from || undefined,
    to: to || undefined,
    status: status || undefined,
    type: type || undefined,
    q: q || undefined,
    page,
    limit: LIMIT,
  };

  const { data, isLoading, isError, refetch } = useAdminReport(kind, params);
  const report = data as AdminReportPayload | undefined;
  const rows = (report?.rows ?? []) as AdminRow[];
  const summary = report?.summary as AdminReportSummary | undefined;
  const pagination = report?.pagination;

  const statuses = statusOptions(kind);
  const monetary = MONETARY.includes(kind);
  const showSearch = kind !== "deposits";

  /** Reset to page 1 whenever the active kind changes (status/type filters may not apply). */
  function selectKind(next: AdminReportKind) {
    setKind(next);
    setStatus("");
    setType("");
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
    setType("");
    setQ("");
    setPage(1);
  }

  /** Click a Type chip (income / wallet) to filter by that ledger type; click the
   *  active one again to clear. Applied immediately. */
  function toggleType(t: string) {
    setType((prev) => (prev === t ? "" : t));
    setPage(1);
  }

  async function exportReport(format: "csv" | "xls") {
    setExporting(format);
    try {
      await downloadAdminReport(kind, { from: from || undefined, to: to || undefined, status: status || undefined, type: type || undefined, q: q || undefined, format });
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
        title="Admin Reports"
        description="Platform-wide reports across users, deposits, withdrawals, income, wallet, gateway, bonanza, and activity — with CSV / Excel / Print export."
        breadcrumbs={[{ label: "Home", to: "/" }, { label: "Dashboard", to: "/app" }, { label: "Admin", to: "/app/admin" }, { label: "Admin Reports" }]}
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
        <Card className="border-0">
          <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">From</label>
              <Input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} className="h-9 w-full sm:w-[150px]" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">To</label>
              <Input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} className="h-9 w-full sm:w-[150px]" />
            </div>
            {statuses.length > 0 && (
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="glass-input h-9 w-full sm:w-[150px] px-3 text-sm"
                >
                  <option value="">All</option>
                  {statuses.map((s) => (
                    <option key={s} value={s}>
                      {s.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {showSearch && (
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Search</label>
                <Input
                  type="text"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && applyFilters()}
                  placeholder={qPlaceholder(kind)}
                  className="h-9 w-full sm:w-[200px]"
                />
              </div>
            )}
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
          {monetary && <StatCard label="Total" value={summary ? formatCurrency(summary.total) : "—"} />}
          <div className={cn("lg:col-span-1", !monetary && "lg:col-span-2")}>
            <ReportChartCard title={labelFor(kind)} description={monetary ? "Daily total" : "Daily count"} series={summary?.series ?? []} />
          </div>
        </div>

        {/* Breakdown chips */}
        <BreakdownChips
          summary={summary}
          kind={kind}
          activeType={type}
          onToggleType={toggleType}
        />

        {/* Table */}
        <DataTable
          columns={adminColumnsFor(kind)}
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
/*  Breakdown chips                                                    */
/* ------------------------------------------------------------------ */

function BreakdownChips({
  summary,
  kind,
  activeType,
  onToggleType,
}: {
  summary: AdminReportSummary | undefined;
  kind: AdminReportKind;
  activeType: string;
  onToggleType: (t: string) => void;
}) {
  if (!summary) return null;
  // Income + Wallet reports break down by ledger Type — make those chips
  // clickable to filter the report to a single type.
  const typeClickable = kind === "income" || kind === "wallet";
  const buckets: { label: string; map?: Record<string, number> }[] = [
    { label: "Status", map: summary.byStatus },
    { label: "Type", map: summary.byType },
    { label: "Action", map: summary.byAction },
  ];
  const present = buckets.filter((b) => b.map && Object.keys(b.map).length > 0);
  if (present.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {present.map((b) => {
        const clickable = typeClickable && b.label === "Type";
        return (
          <div key={b.label} className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">{b.label}:</span>
            {Object.entries(b.map!).map(([k, v]) =>
              clickable ? (
                <button
                  key={k}
                  type="button"
                  onClick={() => onToggleType(k)}
                  title={activeType === k ? "Clear type filter" : `Filter by ${k.replace(/_/g, " ")}`}
                  className={cn(
                    "rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize transition-colors",
                    activeType === k
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-secondary text-secondary-foreground hover:bg-accent hover:text-accent-foreground",
                  )}
                >
                  {k.replace(/_/g, " ")} · {v}
                </button>
              ) : (
                <Badge key={k} variant="secondary" className="capitalize">
                  {k.replace(/_/g, " ")} · {v}
                </Badge>
              ),
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Columns per kind                                                   */
/* ------------------------------------------------------------------ */

function adminColumnsFor(kind: AdminReportKind): Column<AdminRow>[] {
  if (kind === "users") {
    return [
      { key: "joinedAt", header: "Joined", cell: (r) => formatDate((r as AdminUserReportRow).joinedAt) },
      { key: "name", header: "Name", cell: (r) => (r as AdminUserReportRow).name },
      { key: "email", header: "Email", cell: (r) => <span className="font-mono text-xs">{(r as AdminUserReportRow).email}</span> },
      { key: "role", header: "Role", cell: (r) => <span className="capitalize">{(r as AdminUserReportRow).role}</span> },
      { key: "status", header: "Status", cell: (r) => statusBadge((r as AdminUserReportRow).status) },
      { key: "referralCode", header: "Referral code", cell: (r) => <span className="font-mono text-xs">{(r as AdminUserReportRow).referralCode}</span> },
      { key: "directs", header: "Directs", align: "right", cell: (r) => String((r as AdminUserReportRow).directCount) },
      { key: "available", header: "Available", align: "right", cell: (r) => formatCurrency((r as AdminUserReportRow).walletAvailable) },
      { key: "onHold", header: "On hold", align: "right", cell: (r) => formatCurrency((r as AdminUserReportRow).walletOnHold) },
      { key: "lastLoginAt", header: "Last login", cell: (r) => formatDate((r as AdminUserReportRow).lastLoginAt) },
    ];
  }
  if (kind === "deposits") {
    return [
      { key: "createdAt", header: "Date", cell: (r) => formatDate((r as AdminDepositReportRow).createdAt) },
      { key: "user", header: "User", cell: (r) => (r as AdminDepositReportRow).userName },
      { key: "email", header: "Email", cell: (r) => <span className="font-mono text-xs">{(r as AdminDepositReportRow).userEmail}</span> },
      { key: "amount", header: "Amount", align: "right", cell: (r) => formatCurrency((r as AdminDepositReportRow).amountUsd) },
      { key: "currency", header: "Currency", cell: (r) => (r as AdminDepositReportRow).currency },
      { key: "status", header: "Status", cell: (r) => statusBadge((r as AdminDepositReportRow).status) },
      { key: "paidAt", header: "Paid at", cell: (r) => formatDate((r as AdminDepositReportRow).paidAt) },
    ];
  }
  if (kind === "withdrawals") {
    return [
      { key: "createdAt", header: "Date", cell: (r) => formatDate((r as AdminWithdrawalReportRow).createdAt) },
      { key: "user", header: "User", cell: (r) => (r as AdminWithdrawalReportRow).userName },
      { key: "email", header: "Email", cell: (r) => <span className="font-mono text-xs">{(r as AdminWithdrawalReportRow).userEmail}</span> },
      { key: "wallet", header: "Wallet", cell: (r) => <span className="capitalize">{(r as AdminWithdrawalReportRow).wallet}</span> },
      { key: "amount", header: "Amount", align: "right", cell: (r) => formatCurrency((r as AdminWithdrawalReportRow).amount) },
      { key: "address", header: "Address", cell: (r) => <span className="font-mono text-xs">{(r as AdminWithdrawalReportRow).address}</span> },
      { key: "status", header: "Status", cell: (r) => statusBadge((r as AdminWithdrawalReportRow).status) },
      { key: "processedAt", header: "Processed at", cell: (r) => formatDate((r as AdminWithdrawalReportRow).processedAt) },
    ];
  }
  if (kind === "income") {
    return [
      { key: "date", header: "Date", cell: (r) => formatDate((r as AdminIncomeReportRow).date) },
      { key: "user", header: "User", cell: (r) => (r as AdminIncomeReportRow).userName },
      { key: "type", header: "Type", cell: (r) => <span className="capitalize">{(r as AdminIncomeReportRow).type.replace(/_/g, " ")}</span> },
      { key: "amount", header: "Amount", align: "right", cell: (r) => formatCurrency((r as AdminIncomeReportRow).amount) },
      { key: "memo", header: "Memo", cell: (r) => (r as AdminIncomeReportRow).memo ?? "—" },
    ];
  }
  if (kind === "wallet") {
    return [
      { key: "createdAt", header: "Date", cell: (r) => formatDate((r as AdminWalletReportRow).createdAt) },
      { key: "user", header: "User", cell: (r) => (r as AdminWalletReportRow).userName },
      { key: "wallet", header: "Wallet", cell: (r) => <span className="capitalize">{(r as AdminWalletReportRow).wallet}</span> },
      { key: "type", header: "Type", cell: (r) => <span className="capitalize">{(r as AdminWalletReportRow).type.replace(/_/g, " ")}</span> },
      {
        key: "direction",
        header: "Direction",
        cell: (r) => (
          <Badge variant={(r as AdminWalletReportRow).direction === "credit" ? "success" : "destructive"} className="capitalize">
            {(r as AdminWalletReportRow).direction}
          </Badge>
        ),
      },
      {
        key: "amount",
        header: "Amount",
        align: "right",
        cell: (r) => {
          const tx = r as AdminWalletReportRow;
          return (
            <span className={cn("tabular-nums", tx.direction === "credit" ? "text-success" : "text-destructive")}>
              {tx.direction === "credit" ? "+" : "−"}
              {formatCurrency(tx.amount)}
            </span>
          );
        },
      },
      { key: "memo", header: "Memo", cell: (r) => (r as AdminWalletReportRow).memo ?? "—" },
    ];
  }
  if (kind === "gateway") {
    return [
      { key: "createdAt", header: "Date", cell: (r) => formatDate((r as AdminGatewayReportRow).createdAt) },
      { key: "user", header: "User", cell: (r) => (r as AdminGatewayReportRow).userName },
      { key: "invoiceId", header: "Invoice ID", cell: (r) => <span className="font-mono text-xs">{(r as AdminGatewayReportRow).invoiceId ?? "—"}</span> },
      { key: "amount", header: "Amount", align: "right", cell: (r) => formatCurrency((r as AdminGatewayReportRow).amountUsd) },
      { key: "payAmount", header: "Pay amount", align: "right", cell: (r) => ((r as AdminGatewayReportRow).payAmount ?? "—") },
      { key: "status", header: "Status", cell: (r) => statusBadge((r as AdminGatewayReportRow).status) },
      { key: "paidAt", header: "Paid at", cell: (r) => formatDate((r as AdminGatewayReportRow).paidAt) },
    ];
  }
  if (kind === "bonanza") {
    return [
      { key: "awardedAt", header: "Awarded at", cell: (r) => formatDate((r as AdminBonanzaReportRow).awardedAt) },
      { key: "user", header: "User", cell: (r) => (r as AdminBonanzaReportRow).userName },
      { key: "offer", header: "Offer", cell: (r) => (r as AdminBonanzaReportRow).offerName },
      { key: "reward", header: "Reward", align: "right", cell: (r) => formatCurrency((r as AdminBonanzaReportRow).rewardAmount) },
    ];
  }
  // activity
  return [
    { key: "createdAt", header: "Date", cell: (r) => formatDate((r as AdminActivityReportRow).createdAt) },
    { key: "actor", header: "Actor", cell: (r) => (r as AdminActivityReportRow).actorName ?? "—" },
    { key: "action", header: "Action", cell: (r) => <span className="font-mono text-xs">{(r as AdminActivityReportRow).action}</span> },
    { key: "resource", header: "Resource", cell: (r) => (r as AdminActivityReportRow).resource ?? "—" },
    { key: "ip", header: "IP", cell: (r) => <span className="font-mono text-xs">{(r as AdminActivityReportRow).ip ?? "—"}</span> },
  ];
}

export default AdminReportsPage;