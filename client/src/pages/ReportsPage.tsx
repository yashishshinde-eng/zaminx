import { useState } from "react";
import { Download, FileSpreadsheet, Printer } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader, DataTable, type Column } from "@/components/shared";
import { StatCard, ReportChartCard } from "@/components/reports";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useReport } from "@/hooks/useReports";
import { downloadReport } from "@/lib/reports";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import toast from "react-hot-toast";
import type {
  UserReportKind,
  ReportQuery,
  DepositRow,
  WithdrawalRow,
  WalletTxRow,
  P2PTransferRow,
  P2PTransferStatus,
  DepositStatus,
  WithdrawalStatus,
} from "@zeminex/shared";

const LIMIT = 20;

/** Blueprint order: Deposits, Withdrawals, Wallet, the 6 income streams, P2P.
 *  `label` is the full proper-case name shown in headings/export titles;
 *  `tab` is a shorter label shown on the tab chip so the tab row stays compact. */
function getTabs(t: TFunction): { kind: UserReportKind; label: string; tab: string }[] {
  return [
    { kind: "deposits", label: t("reports.labelDeposits"), tab: t("reports.tabDeposits") },
    { kind: "withdrawals", label: t("reports.labelWithdrawals"), tab: t("reports.tabWithdrawals") },
    { kind: "wallet", label: t("reports.labelWallet"), tab: t("reports.tabWallet") },
    { kind: "trading", label: t("reports.labelTradeYield"), tab: t("reports.tabTradeYield") },
    { kind: "direct", label: t("reports.labelDirectConnect"), tab: t("reports.tabDirectConnect") },
    { kind: "team", label: t("reports.labelTeamEnergy"), tab: t("reports.tabTeamEnergy") },
    { kind: "community", label: t("reports.labelCommunity"), tab: t("reports.tabCommunity") },
    { kind: "rank", label: t("reports.labelRankReward"), tab: t("reports.tabRankReward") },
    { kind: "bonanza", label: t("reports.labelBonanza"), tab: t("reports.tabBonanza") },
    { kind: "p2p", label: t("reports.labelP2p"), tab: t("reports.tabP2p") },
  ];
}

const DEPOSIT_STATUSES: DepositStatus[] = ["pending", "paid", "expired", "failed"];
const WITHDRAWAL_STATUSES: WithdrawalStatus[] = [
  "pending",
  "under_review",
  "approved",
  "rejected",
  "paid",
  "cancelled",
];
const P2P_STATUSES: P2PTransferStatus[] = ["completed", "failed"];

/** /app/reports — per-user reports with filters, summary + chart, table, export. */
export function ReportsPage() {
  const { t } = useTranslation();
  const TABS = getTabs(t);
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
  const rows = (report?.rows ?? []) as DepositRow[] | WithdrawalRow[] | WalletTxRow[] | P2PTransferRow[];
  const summary = report?.summary;
  const pagination = report?.pagination;

  const statusOptions =
    kind === "deposits"
      ? DEPOSIT_STATUSES
      : kind === "withdrawals"
        ? WITHDRAWAL_STATUSES
        : kind === "p2p"
          ? P2P_STATUSES
          : [];

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
      toast.success(t("reports.exportReady", { format: format.toUpperCase() }));
    } catch {
      /* axios interceptor toasts the error */
    } finally {
      setExporting("");
    }
  }

  return (
    <AppShell>
      <PageHeader
        title={t("reports.title")}
        description={t("reports.description")}
        breadcrumbs={[{ label: t("common.home"), to: "/" }, { label: t("common.dashboard"), to: "/app" }, { label: t("reports.title") }]}
      />

      <div className="mt-6 space-y-6">
        {/* Tabs */}
        <Tabs value={kind} defaultValue="deposits" onValueChange={(v) => selectKind(v as UserReportKind)}>
          <TabsList className="neon-card neon-blue flex w-full overflow-x-auto overflow-y-hidden whitespace-nowrap rounded-[14px] bg-muted p-1">
            {TABS.map((tab) => (
              <TabsTrigger key={tab.kind} value={tab.kind} className="flex-1 whitespace-nowrap">
                {tab.tab}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Filters */}
        <Card>
          <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">{t("reports.from")}</label>
              <Input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} className="h-9 w-full sm:w-[150px]" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">{t("reports.to")}</label>
              <Input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} className="h-9 w-full sm:w-[150px]" />
            </div>
            {statusOptions.length > 0 && (
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">{t("common.status")}</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="glass-input h-9 w-full sm:w-[150px] px-3 text-sm"
                >
                  <option value="">{t("common.all")}</option>
                  {statusOptions.map((s) => (
                    <option key={s} value={s}>
                      {statusLabel(t, s)}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">{t("reports.search")}</label>
              <Input
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && applyFilters()}
                placeholder={kind === "withdrawals" ? t("reports.searchAddress") : t("reports.searchMemo")}
                className="h-9 w-full sm:w-[200px]"
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={applyFilters}>
                {t("reports.apply")}
              </Button>
              <Button size="sm" variant="outline" onClick={clearFilters}>
                {t("reports.clear")}
              </Button>
            </div>
            <div className="sm:ml-auto flex gap-2">
              <Button size="sm" variant="outline" disabled={exporting !== ""} onClick={() => exportReport("csv")}>
                <Download className="size-4" /> {exporting === "csv" ? "…" : t("reports.csv")}
              </Button>
              <Button size="sm" variant="outline" disabled={exporting !== ""} onClick={() => exportReport("xls")}>
                <FileSpreadsheet className="size-4" /> {exporting === "xls" ? "…" : t("reports.excel")}
              </Button>
              <Button size="sm" variant="outline" onClick={() => window.print()}>
                <Printer className="size-4" /> {t("reports.print")}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Summary + chart */}
        <div className="grid gap-6 lg:grid-cols-3">
          <StatCard label={t("reports.records")} value={summary ? String(summary.count) : "—"} />
          <StatCard label={t("reports.total")} value={summary ? formatCurrency(summary.total) : "—"} />
          <ReportChartCard title={labelFor(TABS, kind)} description={t("reports.dailyTotal")} series={summary?.series ?? []} />
        </div>

        {/* Table */}
        <DataTable
          columns={columnsFor(kind, t)}
          data={rows}
          rowKey={(r) => r.id}
          isLoading={isLoading}
          error={isError ? t("reports.couldNotLoad") : null}
          onRetry={() => refetch()}
          emptyTitle={t("reports.noRecordsTitle")}
          emptyDescription={t("reports.noRecordsDesc")}
          page={pagination?.page ?? 1}
          pageCount={pagination?.totalPages ?? 1}
          onPageChange={setPage}
        />
      </div>
    </AppShell>
  );
}

/* ------------------------------------------------------------------ */
/*  Columns per kind                                                   */
/* ------------------------------------------------------------------ */

function labelFor(tabs: { kind: UserReportKind; label: string; tab: string }[], kind: UserReportKind): string {
  return tabs.find((tab) => tab.kind === kind)?.label ?? kind;
}

/** Translated label for any status value across deposits/withdrawals/p2p. */
function statusLabel(t: TFunction, status: string): string {
  const map: Record<string, string> = {
    pending: t("reports.statusPending"),
    paid: t("reports.statusPaid"),
    expired: t("reports.statusExpired"),
    failed: t("reports.statusFailed"),
    under_review: t("reports.statusUnderReview"),
    approved: t("reports.statusApproved"),
    rejected: t("reports.statusRejected"),
    cancelled: t("reports.statusCancelled"),
    completed: t("reports.statusCompleted"),
  };
  return map[status] ?? status.replace("_", " ");
}

function statusBadge(status: string, t: TFunction) {
  const variant =
    status === "paid" || status === "approved" || status === "completed"
      ? "success"
      : status === "pending" || status === "under_review"
        ? "warning"
        : status === "rejected" || status === "failed" || status === "cancelled" || status === "expired"
          ? "destructive"
          : "secondary";
  return (
    <Badge variant={variant} className="capitalize">
      {statusLabel(t, status)}
    </Badge>
  );
}

function columnsFor(kind: UserReportKind, t: TFunction): Column<DepositRow | WithdrawalRow | WalletTxRow | P2PTransferRow>[] {
  if (kind === "deposits") {
    return [
      { key: "amount", header: t("common.amount"), align: "right", cell: (r) => formatCurrency((r as DepositRow).amountUsd) },
      { key: "currency", header: t("reports.columnCurrency"), cell: (r) => (r as DepositRow).currency },
      { key: "status", header: t("common.status"), cell: (r) => statusBadge((r as DepositRow).status, t) },
      { key: "paidAt", header: t("reports.columnPaidAt"), cell: (r) => formatDate((r as DepositRow).paidAt) },
      { key: "createdAt", header: t("common.date"), cell: (r) => formatDate((r as DepositRow).createdAt) },
    ];
  }
  if (kind === "withdrawals") {
    return [
      { key: "wallet", header: t("common.wallet"), cell: (r) => <span className="capitalize">{(r as WithdrawalRow).wallet}</span> },
      { key: "amount", header: t("common.amount"), align: "right", cell: (r) => formatCurrency((r as WithdrawalRow).amount) },
      { key: "address", header: t("reports.columnAddress"), cell: (r) => <span className="font-mono text-xs">{(r as WithdrawalRow).address}</span> },
      { key: "status", header: t("common.status"), cell: (r) => statusBadge((r as WithdrawalRow).status, t) },
      { key: "processedAt", header: t("reports.columnProcessedAt"), cell: (r) => formatDate((r as WithdrawalRow).processedAt) },
      { key: "createdAt", header: t("common.date"), cell: (r) => formatDate((r as WithdrawalRow).createdAt) },
    ];
  }
  if (kind === "p2p") {
    return [
      { key: "from", header: t("reports.columnFrom"), cell: (r) => (r as P2PTransferRow).fromUserName },
      { key: "to", header: t("reports.columnTo"), cell: (r) => (r as P2PTransferRow).toUserName },
      { key: "wallet", header: t("common.wallet"), cell: (r) => <span className="capitalize">{(r as P2PTransferRow).wallet}</span> },
      { key: "amount", header: t("common.amount"), align: "right", cell: (r) => formatCurrency((r as P2PTransferRow).amount) },
      { key: "status", header: t("common.status"), cell: (r) => statusBadge((r as P2PTransferRow).status, t) },
      { key: "memo", header: t("reports.columnMemo"), cell: (r) => (r as P2PTransferRow).memo ?? "—" },
      { key: "createdAt", header: t("common.date"), cell: (r) => formatDate((r as P2PTransferRow).createdAt) },
    ];
  }
  // Ledger kinds (wallet + 6 income streams). "Direct Connect" and "Team
  // Energy" are earned from a specific downline member at a specific lineage
  // level — show who it came from and at which level for those two.
  const showSource = kind === "direct" || kind === "team";
  const base: Column<DepositRow | WithdrawalRow | WalletTxRow | P2PTransferRow>[] = [
    { key: "wallet", header: t("common.wallet"), cell: (r) => <span className="capitalize">{(r as WalletTxRow).wallet}</span> },
    { key: "type", header: t("reports.columnType"), cell: (r) => <span className="capitalize">{txTypeLabel(t, (r as WalletTxRow).type)}</span> },
    {
      key: "direction",
      header: t("reports.columnDirection"),
      cell: (r) => (
        <Badge variant={(r as WalletTxRow).direction === "credit" ? "success" : "destructive"} className="capitalize">
          {(r as WalletTxRow).direction === "credit" ? t("reports.credit") : t("reports.debit")}
        </Badge>
      ),
    },
    {
      key: "amount",
      header: t("common.amount"),
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
  ];
  const sourceColumns: Column<DepositRow | WithdrawalRow | WalletTxRow | P2PTransferRow>[] = showSource
    ? [
        {
          key: "from",
          header: t("reports.columnFrom"),
          cell: (r) => {
            const tx = r as WalletTxRow;
            if (!tx.fromUserName) return "—";
            return (
              <span>
                {tx.fromUserName}
                {tx.fromReferralCode && <span className="ml-1 font-mono text-xs text-muted-foreground">({tx.fromReferralCode})</span>}
              </span>
            );
          },
        },
        {
          key: "level",
          header: t("reports.columnLevel"),
          cell: (r) => {
            const l = (r as WalletTxRow).level;
            return l ? `L${l}` : "—";
          },
        },
      ]
    : [];
  return [
    ...base,
    ...sourceColumns,
    { key: "memo", header: t("reports.columnMemo"), cell: (r) => (r as WalletTxRow).memo ?? "—" },
    { key: "createdAt", header: t("common.date"), cell: (r) => formatDate((r as WalletTxRow).createdAt) },
  ];
}

/** Translated ledger-type label, reusing the same `wallet.type*` keys as the
 *  Wallet page so the two views agree on wording. Unmapped types (rare —
 *  withdrawal holds/releases, package activation) fall back to the raw type. */
const TX_TYPE_KEYS: Record<string, string> = {
  deposit: "wallet.typeDeposit",
  trading_yield: "wallet.typeTradingYield",
  direct_bonus: "wallet.typeDirectBonus",
  team_bonus: "wallet.typeTeamBonus",
  community_bonus: "wallet.typeCommunityBonus",
  rank_reward: "wallet.typeRankReward",
  bonanza: "wallet.typeBonanza",
  p2p_transfer_out: "wallet.typeP2pOut",
  p2p_transfer_in: "wallet.typeP2pIn",
  adjustment: "wallet.typeAdjustment",
};

function txTypeLabel(t: TFunction, type: string): string {
  const key = TX_TYPE_KEYS[type];
  return key ? t(key) : type.replace(/_/g, " ");
}

export default ReportsPage;