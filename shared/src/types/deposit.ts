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
  /** Null for admin-recorded standalone deposits (no package activation). */
  userPackageId: string | null;
  /** Null for admin-recorded standalone deposits (no package activation). */
  packageId: string | null;
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
  /** When the payment link/address expires (10 min after creation). Null for
   *  non-expiring deposits (admin manual / package activation). The client shows
   *  a live countdown to this; once passed the deposit is lazily marked expired. */
  expiresAt: string | null;
}

/** Response to POST /packages/activate — the pending subscription + its payment. */
export interface ActivatePackageResponse {
  package: UserPackageRow;
  payment: DepositRow;
}

/** Response to GET /packages/lookup-target — a resolved beneficiary for an
 *  "activate for another user" flow. `isSelf` lets the UI block self-targeting. */
export interface PackageTargetLookup {
  id: string;
  name: string;
  status: "active" | "inactive" | "blocked";
  isSelf: boolean;
}