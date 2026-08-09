import type { UserRole } from "./index";
import type { WalletBalances } from "./wallet";
import type { WithdrawalStatus } from "./withdrawal";

/**
 * The six-stream income summary shown on the dashboard. Per-stream totals are
 * summed from the immutable wallet ledger (Phases 10 & 10A); `series` is a
 * 30-day daily-totals set for the area chart.
 */
export interface IncomeSummary {
  trading: number;
  direct: number;
  team: number;
  community: number;
  rankReward: number;
  bonanza: number;
  total: number;
  series: { date: string; value: number }[];
}

/**
 * Aggregated dashboard payload returned by `GET /dashboard/summary`.
 * Most slices are zero/empty until their owning phase wires real data:
 * wallets → Phase 8, package → Phase 6, income → Phase 10,
 * notifications → Phase 12. `account`, `referral`, and `recentActivity`
 * are real today.
 */
export interface DashboardSummary {
  account: {
    name: string;
    email: string;
    role: UserRole;
    isEmailVerified: boolean;
    status: string;
    memberSince: string; // ISO createdAt
    rank: { name: string; nextRank: string | null; progress: number }; // 0..1
  };
  referral: { code: string; link: string };
  /** Phase 9 (Referral) — real direct + team (all-level) counts. */
  team: {
    directCount: number;
    teamCount: number;
    activeDirectCount: number;
    activeTeamCount: number;
  };
  /** Phase 8 (Wallet) — real Main/Bonus/Trading balances + totals. */
  wallets: WalletBalances;
  package: {
    active: boolean;
    name: string | null;
    activatedAt: string | null; // ISO — set when a subscription flips to active (Phase 7)
    historyCount: number;
    /** Subscriptions awaiting payment (created in Phase 6, confirmed in Phase 7). */
    pending: number;
  };
  income: IncomeSummary;
  notifications: {
    unread: number;
    items: { id: string; title: string; createdAt: string }[];
  };
  /** Real rows from the ActivityLog collection (most recent first). */
  recentActivity: { id: string; action: string; createdAt: string }[];
}

/* ------------------------------------------------------------------ */
/*  Phase 14A — platform-wide admin dashboard                            */
/* ------------------------------------------------------------------ */

/** Counts of users grouped by status. */
export interface AdminUsersByStatus {
  active: number;
  inactive: number;
  blocked: number;
}

/** Aggregate deposit volume (paid deposits only). */
export interface AdminDepositTotals {
  count: number;
  sumUsd: number;
}

/** Aggregate withdrawal volume broken down by status. */
export interface AdminWithdrawalTotals {
  count: number;
  sumUsd: number;
  byStatus: Record<WithdrawalStatus, number>;
}

/** Headline KPIs for the admin dashboard landing. */
export interface AdminDashboardKpis {
  totalUsers: number;
  byStatus: AdminUsersByStatus;
  totalDeposits: AdminDepositTotals;
  totalWithdrawals: AdminWithdrawalTotals;
  /** Total platform liabilities — all wallets, available + onHold. */
  aum: number;
  activePackages: number;
  sponsors: number;
}

/** 30-day daily volume for the deposits-vs-withdrawals chart. */
export interface AdminDashboardSeriesPoint {
  date: string; // YYYY-MM-DD
  deposits: number;
  withdrawals: number;
}

/** A recent audit-log entry with the actor's name (null for system events). */
export interface AdminDashboardActivityRow {
  id: string;
  actorName: string | null;
  action: string;
  createdAt: string;
}

/** `GET /admin/dashboard` payload — platform-wide KPIs + series + activity. */
export interface AdminDashboardSummary {
  kpis: AdminDashboardKpis;
  series: AdminDashboardSeriesPoint[];
  recentActivity: AdminDashboardActivityRow[];
}