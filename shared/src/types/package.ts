/**
 * Package module — investment tiers (catalog) and a user's subscriptions.
 *
 * Phase 6 owns the catalog, activation initiation (creates a `pending`
 * subscription awaiting payment), and history/status. Phase 7 wires the
 * NOWPayments invoice + webhook that flips `pending` → `active`.
 */

/** A single admin-defined investment tier, as shown in the catalog. */
export interface PackageTier {
  id: string;
  name: string;
  slug: string;
  description?: string;
  priceUsd: number;
  /** Daily trading yield, e.g. 1.5 = 1.5%. */
  dailyReturnPct: number;
  /** Term length in days. 0 means LIFETIME (no expiry). */
  durationDays: number;
  features: string[];
  sort: number;
  status: "active" | "inactive";
}

/** Lifecycle status of a user's subscription to a package. */
export type UserPackageStatus = "pending" | "active" | "expired" | "cancelled";
export type UserPackagePaymentStatus = "pending" | "paid" | "failed";

/** Payment info joined onto a subscription row when it has an associated
 *  deposit (Phase 7). Present for rows that have started payment. */
export interface UserPackagePayment {
  depositId: string;
  status: "pending" | "paid" | "expired" | "failed";
  /** USDT-BEP20 address to send funds to. */
  payAddress: string | null;
  /** Crypto amount due. */
  payAmount: number | null;
  currency: "USDT-BEP20";
  /** NOWPayments hosted checkout URL (null in sandbox). */
  hostedUrl: string | null;
  /** True when the invoice is a local mock (no NOWPayments keys configured). */
  sandbox: boolean;
}

/** A user's subscription row (activation history). Terms are snapshotted at
 *  activation for immutable-ledger integrity. */
export interface UserPackageRow {
  id: string;
  packageId: string;
  snapshot: {
    name: string;
    priceUsd: number;
    dailyReturnPct: number;
    /** 0 means LIFETIME (no expiry). */
    durationDays: number;
  };
  status: UserPackageStatus;
  paymentStatus: UserPackagePaymentStatus;
  /** ISO — set when the subscription flips to active (Phase 7 webhook). */
  activatedAt: string | null;
  /** ISO — computed on activation (Phase 7). */
  expiresAt: string | null;
  createdAt: string;
  /** Joined deposit/payment info (Phase 7). Present when payment was started. */
  payment?: UserPackagePayment;
}