import type { UserPackageRow } from "./package";

/**
 * Deposit module — a deposit (invoice/payment) created when a user activates a
 * package. Phase 7 wires NOWPayments (USDT-BEP20 only). Status flips
 * pending → paid on webhook confirmation, which also activates the package.
 */

export type DepositStatus = "pending" | "paid" | "expired" | "failed";

/** The only supported deposit currency. */
export type DepositCurrency = "USDT-BEP20";

/** A deposit record, as returned over the API. */
export interface DepositRow {
  id: string;
  userPackageId: string;
  packageId: string;
  amountUsd: number;
  currency: DepositCurrency;
  status: DepositStatus;
  /** USDT-BEP20 address the user sends funds to. */
  payAddress: string | null;
  /** Crypto amount due. */
  payAmount: number | null;
  /** NOWPayments hosted checkout URL (null in sandbox). */
  hostedUrl: string | null;
  /** True when the invoice was mocked locally (no NOWPayments keys configured). */
  sandbox: boolean;
  createdAt: string;
  paidAt: string | null;
}

/** Response to POST /packages/activate — the pending subscription + its payment. */
export interface ActivatePackageResponse {
  package: UserPackageRow;
  payment: DepositRow;
}