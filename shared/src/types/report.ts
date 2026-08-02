import type { DepositRow } from "./deposit";
import type { WithdrawalRow } from "./withdrawal";
import type { WalletTxRow, WalletTxType } from "./wallet";

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

/* ------------------------------------------------------------------ */
/*  Admin reports — Phase 11A                                         */
/* ------------------------------------------------------------------ */

/**
 * The 8 admin report kinds (platform-wide, not user-scoped). Admin is
 * authorised to see PII (email/wallet) — the no-PII rule applies only to
 * user-facing downline views.
 */
export type AdminReportKind =
  | "users"
  | "deposits"
  | "withdrawals"
  | "income"
  | "wallet"
  | "gateway"
  | "bonanza"
  | "activity";

/** Admin summary extends the user summary with optional per-bucket breakdowns. */
export interface AdminReportSummary extends ReportSummary {
  byStatus?: Record<string, number>;
  byType?: Record<string, number>;
  byAction?: Record<string, number>;
}

/** A generic admin report response: rows + pagination + admin summary. */
export interface AdminReportResult<TRow> {
  rows: TRow[];
  pagination: ReportPagination;
  summary: AdminReportSummary;
}

/** One user row in the admin Users report (with wallet balances + directCount). */
export interface AdminUserReportRow {
  id: string;
  name: string;
  email: string;
  role: "user" | "admin";
  status: "active" | "suspended" | "banned";
  referralCode: string;
  referredBy: string | null;
  isEmailVerified: boolean;
  directCount: number;
  walletAvailable: number;
  walletOnHold: number;
  joinedAt: string;
  lastLoginAt: string | null;
}

/** A deposit row enriched with the owning user's name/email (admin view). */
export interface AdminDepositReportRow extends DepositRow {
  userId: string;
  userName: string;
  userEmail: string;
}

/** A withdrawal row enriched with the owning user's name/email (admin view). */
export interface AdminWithdrawalReportRow extends WithdrawalRow {
  userId: string;
  userName: string;
  userEmail: string;
}

/** One income ledger entry (credit only) with the earning user's name. */
export interface AdminIncomeReportRow {
  id: string;
  date: string;
  userId: string;
  userName: string;
  type: WalletTxType;
  amount: number;
  memo: string | null;
}

/** A wallet ledger row enriched with the owning user's name/email (admin view). */
export interface AdminWalletReportRow extends WalletTxRow {
  userId: string;
  userName: string;
  userEmail: string;
}

/** A gateway/invoice view of a deposit (NOWPayments invoice dimensions). */
export interface AdminGatewayReportRow {
  id: string;
  invoiceId: string | null;
  userId: string;
  userName: string;
  amountUsd: number;
  payAmount: number | null;
  currency: string;
  status: string;
  sandbox: boolean;
  hostedUrl: string | null;
  createdAt: string;
  paidAt: string | null;
}

/** A bonanza award (ledger row of type `bonanza`) with the offer + user names. */
export interface AdminBonanzaReportRow {
  id: string;
  userId: string;
  userName: string;
  offerId: string;
  offerName: string;
  rewardAmount: number;
  awardedAt: string;
}

/** One audit-log entry with the actor's name (null for system events). */
export interface AdminActivityReportRow {
  id: string;
  actorId: string | null;
  actorName: string | null;
  action: string;
  resource: string | null;
  resourceId: string | null;
  ip: string | null;
  createdAt: string;
}

/** The union of admin report payloads — narrowed by `kind` on the client. */
export type AdminReportPayload =
  | AdminReportResult<AdminUserReportRow>
  | AdminReportResult<AdminDepositReportRow>
  | AdminReportResult<AdminWithdrawalReportRow>
  | AdminReportResult<AdminIncomeReportRow>
  | AdminReportResult<AdminWalletReportRow>
  | AdminReportResult<AdminGatewayReportRow>
  | AdminReportResult<AdminBonanzaReportRow>
  | AdminReportResult<AdminActivityReportRow>;