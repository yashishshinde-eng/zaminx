import type { WalletType } from "./wallet";

/**
 * Withdrawal module — Phase 8A. USDT-BEP20 only, manual admin approval.
 *
 * Lifecycle: `pending → under_review → approved → rejected | paid | cancelled`.
 * Financial moves on the immutable wallet ledger:
 *   - submit (pending):   `available → onHold`   (`withdrawal_hold`)
 *   - reject / cancel:     `onHold → available`   (`withdrawal_release`)
 *   - mark paid:           `onHold` permanently deducted (`withdrawal_paid`)
 * Admin approval UI is Phase 14; these types back both the user and admin APIs.
 */

export type WithdrawalStatus =
  | "pending"
  | "under_review"
  | "approved"
  | "rejected"
  | "paid"
  | "cancelled";

/** The only supported withdrawal currency. */
export type WithdrawalCurrency = "USDT-BEP20";

/** A withdrawal request, as returned over the API. */
export interface WithdrawalRow {
  id: string;
  /** Which wallet funds the withdrawal (main/bonus/trading). */
  wallet: WalletType;
  amount: number;
  currency: WithdrawalCurrency;
  /** USDT-BEP20 payout address, snapshotted from the user's profile at submit. */
  address: string;
  status: WithdrawalStatus;
  /** Latest admin note (review/reject/pay remarks). */
  remarks: string | null;
  /** Admin who last acted on it. */
  processedBy: string | null;
  /** ISO — set on the most recent transition. */
  processedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** A paginated page of withdrawals. */
export interface WithdrawalPage {
  items: WithdrawalRow[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}