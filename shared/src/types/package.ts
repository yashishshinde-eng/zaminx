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
  /** Term length in days. */
  durationDays: number;
  features: string[];
  sort: number;
  status: "active" | "inactive";
}

/** Lifecycle status of a user's subscription to a package. */
export type UserPackageStatus = "pending" | "active" | "expired" | "cancelled";
export type UserPackagePaymentStatus = "pending" | "paid" | "failed";

/** A user's subscription row (activation history). Terms are snapshotted at
 *  activation for immutable-ledger integrity. */
export interface UserPackageRow {
  id: string;
  packageId: string;
  snapshot: {
    name: string;
    priceUsd: number;
    dailyReturnPct: number;
    durationDays: number;
  };
  status: UserPackageStatus;
  paymentStatus: UserPackagePaymentStatus;
  /** ISO — set when the subscription flips to active (Phase 7 webhook). */
  activatedAt: string | null;
  /** ISO — computed on activation (Phase 7). */
  expiresAt: string | null;
  createdAt: string;
}