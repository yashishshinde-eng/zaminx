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
 * One lineage level of the Daily Team Energy qualification table.
 * Star N requires `required` (3^N) ACTIVE members at depth level `level`.
 */
export interface TeamEnergyLevelRow {
  /** 1 = direct members. */
  level: number;
  /** ACTIVE (package-activated) members at this level. */
  activeCount: number;
  /** 3^level — the qualification requirement. */
  required: number;
  /** activeCount >= required. */
  qualified: boolean;
}

/**
 * Daily Team Energy slice — dashboard card + `GET /dashboard/team-energy`.
 * Everything is computed server-side; the star is always recalculated from
 * the authoritative DB per-level counts, never from a cache.
 */
export interface TeamEnergyInfo {
  /** Computed star, 0..10 (0 = unqualified — no Team Energy Bonus). */
  starLevel: number;
  /** Same value as `starLevel` (spec's "position in the star table"). */
  starPosition: number;
  /** Daily bonus percentage for the current star (e.g. 0.25). 0 when unqualified. */
  bonusPercentage: number;
  /** Total ACTIVE members within levels 1..starLevel (the bonus base pool). */
  teamMemberCount: number;
  /** Per-level qualification rows (levels 1..10). */
  perLevel: TeamEnergyLevelRow[];
  /** Progress toward the next star. Null when `starLevel >= 10`. */
  nextStar: { level: number; required: number; current: number; gap: number } | null;
  /** `team_bonus` credits for the current earning day (UTC). */
  todayBonus: number;
  /** All-time `team_bonus` credits (matches `income.team`). */
  totalBonus: number;
}

/**
 * Community Monthly Bonus slice — dashboard card + `GET /dashboard/community`.
 * Uses the SAME centralized Star Qualification Engine as the Daily Team Energy
 * bonus (`starQualification.service.ts` — 3^N active members at lineage level
 * N, sequential), but pays the star's FIXED monthly $ amount (never a
 * percentage, never derived from a Team Energy amount) once per distribution
 * month on the 10th. Everything is computed server-side.
 */
export interface CommunityBonusInfo {
  /** Computed star, 0..10 (0 = unqualified — no monthly bonus). */
  starLevel: number;
  /** Same value as `starLevel` (spec's "position in the star table"). */
  starPosition: number;
  /** ACTIVE members at the qualified star's own level (the spec's
   *  "qualifying team members"). 0 when unqualified. */
  qualifyingTeamMembers: number;
  /** 3^starLevel — the requirement the qualified level satisfied. */
  requiredTeamMembers: number;
  /** Fixed monthly $ amount for the current star (spec table). 0 when unqualified. */
  monthlyBonus: number;
  /** Per-level qualification rows (levels 1..10) — same table as Team Energy. */
  perLevel: TeamEnergyLevelRow[];
  /** Progress toward the next star. Null when `starLevel >= 10`. */
  nextStar: { level: number; required: number; current: number; gap: number } | null;
  /** The most recent distribution, if any (month = YYYY-MM). */
  lastDistribution: { month: string; amount: number; date: string } | null;
  /** All-time `community_bonus` credits (matches `income.community`). */
  totalBonus: number;
  /** Recent distributions, newest first (capped at 6). */
  history: { id: string; month: string; amount: number; createdAt: string }[];
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
  /** Daily Team Energy slice (Phase: Team Energy — star-qualified bonus). */
  teamEnergy: TeamEnergyInfo;
  /** Community Monthly Bonus slice (fixed $ per qualified star, monthly). */
  communityBonus: CommunityBonusInfo;
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