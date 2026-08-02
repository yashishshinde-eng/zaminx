import type { UserRole } from "./index";
import type { WalletBalances } from "./wallet";

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
  income: {
    trading: number;
    direct: number;
    team: number;
    community: number;
    rankReward: number;
    bonanza: number;
    total: number;
    /** Daily totals for the area chart. Empty until Phase 10 → empty-state chart. */
    series: { date: string; value: number }[];
  };
  notifications: {
    unread: number;
    items: { id: string; title: string; createdAt: string }[];
  };
  /** Real rows from the ActivityLog collection (most recent first). */
  recentActivity: { id: string; action: string; createdAt: string }[];
}