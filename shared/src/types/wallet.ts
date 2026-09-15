/**
 * Wallet System — Phase 8.
 *
 * Three wallets per user, each with an `available` and an `onHold` balance:
 *   - Main    : deposit principal (credited when a deposit confirms).
 *   - Trading : daily trade yield (Phase 10).
 *   - Bonus   : direct / team / community / rank / bonanza bonuses (Phase 10).
 *
 * `onHold` stays 0 until Phase 8A withdrawals move `available → onHold`.
 * The immutable ledger (`wallet_transactions`) is the source of truth; the
 * `Wallet` document materialises balances for fast reads.
 */

import { z } from "zod";
import { adminWalletAdjustSchema, adminDepositCreateSchema } from "../schemas/wallet.schema.js";

export type WalletType = "main" | "bonus" | "trading";

/** Which balance field a ledger entry affected. */
export type WalletBalanceField = "available" | "onHold";

export type WalletTxDirection = "credit" | "debit";

/**
 * Ledger entry types. Only `deposit` is produced in Phase 8; the rest are
 * declared now so the enum is stable as later phases write to the ledger.
 */
export type WalletTxType =
  | "deposit"
  | "trading_yield"
  | "direct_bonus"
  | "team_bonus"
  | "community_bonus"
  | "rank_reward"
  | "bonanza"
  | "withdrawal_hold"
  | "withdrawal_release"
  | "withdrawal_paid"
  | "withdrawal_reject"
  | "adjustment"
  | "p2p_transfer_out"
  | "p2p_transfer_in"
  | "package_activation";

/** A single wallet's available + on-hold balances. */
export interface WalletBalance {
  available: number;
  onHold: number;
}

/** All three wallets + rolled-up totals, as returned by `GET /wallet`. */
export interface WalletBalances {
  main: WalletBalance;
  bonus: WalletBalance;
  trading: WalletBalance;
  totalAvailable: number;
  totalOnHold: number;
  total: number;
}

/** External reference on a ledger entry (e.g. the Deposit that funded it). */
export interface WalletTxRef {
  resource: string | null;
  resourceId: string | null;
}

/** One downline contributor behind an aggregated `team_bonus` credit — the
 *  Daily Team Energy engine pays one credit per ancestor per day, summed
 *  across every downline package within the ancestor's star depth, so a
 *  single row can have many contributors at different lineage levels. */
export interface WalletTxSource {
  fromUserId: string;
  fromUserName: string | null;
  fromReferralCode: string | null;
  level: number;
  /** This contributor's share of the credited bonus amount (proportional to
   *  their eligible yield base; may differ from the row total by a cent due
   *  to rounding). */
  amount: number;
}

/** An immutable ledger row, as returned over the API. */
export interface WalletTxRow {
  id: string;
  wallet: WalletType;
  type: WalletTxType;
  direction: WalletTxDirection;
  amount: number;
  /** Wallet `available` balance immediately after this entry. */
  availableAfter: number;
  /** Wallet `onHold` balance immediately after this entry. */
  onHoldAfter: number;
  memo: string | null;
  reference: WalletTxRef | null;
  /** For team-income streams (`direct_bonus` / `team_bonus`): the downline user
   *  whose activity generated this credit, and which lineage level they sit at
   *  relative to the earner (1 = direct sponsor). Null for every other type. */
  fromUserId?: string | null;
  fromUserName?: string | null;
  fromReferralCode?: string | null;
  level?: number | null;
  /** Daily Team Energy (`team_bonus`, new model): the star level earned,
   *  bonus %, the eligible base the % applied to, and the earning day (UTC
   *  YYYY-MM-DD). Null on legacy per-level rows and every other type. */
  starLevel?: number | null;
  bonusPercentage?: number | null;
  eligibleBonusBase?: number | null;
  earningDate?: string | null;
  /** Per-contributor breakdown behind an aggregated `team_bonus` credit (see
   *  `WalletTxSource`). Null/absent on every other type and on legacy rows
   *  predating this breakdown. */
  sources?: WalletTxSource[] | null;
  /** Community Monthly Bonus (`community_bonus`): the distribution month
   *  (YYYY-MM) the payout belongs to. Null on legacy rows and other types. */
  distributionMonth?: string | null;
  createdAt: string;
}

/** A paginated page of ledger rows. */
export interface WalletLedgerPage {
  items: WalletTxRow[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/* ---- Phase 14C admin wallet adjustment ---- */

/** Body for `POST /admin/users/:id/wallet/adjust`. */
export type AdminWalletAdjustBody = z.infer<typeof adminWalletAdjustSchema>["body"];

/** Body for `POST /admin/users/:id/deposits` (admin manual deposit). */
export type AdminDepositCreateBody = z.infer<typeof adminDepositCreateSchema>["body"];