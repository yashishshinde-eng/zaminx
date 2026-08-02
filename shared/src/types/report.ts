import type { DepositRow } from "./deposit";
import type { WithdrawalRow } from "./withdrawal";
import type { WalletTxRow } from "./wallet";

/**
 * Reports module — Phase 11.
 *
 * The 9 user report kinds. "Wallet" + the 6 income streams all read the
 * immutable wallet ledger (the income streams filter by `WalletTxType`);
 * Deposits and Withdrawals read their own collections. Admin report kinds
 * arrive in Phase 11A.
 */
export type UserReportKind =
  | "deposits"
  | "withdrawals"
  | "wallet"
  | "trading"
  | "direct"
  | "team"
  | "community"
  | "rank"
  | "bonanza";

/** Pagination block shared by every report response. */
export interface ReportPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** Summary block: row count, the kind's primary total, and a daily series. */
export interface ReportSummary {
  count: number;
  total: number;
  series: { date: string; value: number }[];
}

/** A generic report response: a page of rows + pagination + summary. */
export interface ReportResult<TRow> {
  rows: TRow[];
  pagination: ReportPagination;
  summary: ReportSummary;
}

export type DepositReport = ReportResult<DepositRow>;
export type WithdrawalReport = ReportResult<WithdrawalRow>;
export type LedgerReport = ReportResult<WalletTxRow>;

/** Export format for `GET /reports/:kind/export`. */
export type ReportExportFormat = "csv" | "xls";