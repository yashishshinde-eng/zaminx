/**
 * Package service — thin facade over the catalog + deposit services.
 *
 * Phase 6 owned the catalog and bare activation; Phase 7 moved activation +
 * payment into the deposit service (NOWPayments). The flow is now decoupled:
 * a user deposits funds to their wallet (POST /payments/deposit) and then
 * activates a package from the wallet balance here. This module keeps the
 * stable `listCatalog` / `getMyPackages` / `activatePackage` exports the
 * controller relies on while delegating the wallet-debit + activation work to
 * the deposit service.
 */
import { activatePackageFromWallet, getMyPackagesWithPayment, listCatalog as listCatalogImpl } from "./deposit.service.js";
import type { DepositRow, PackageTier, UserPackageRow } from "@zeminex/shared";

/** GET /packages — active catalog (delegated to deposit service's catalog helper). */
export const listCatalog = listCatalogImpl;

/** GET /packages/mine — the user's subscriptions with joined payment info. */
export const getMyPackages = getMyPackagesWithPayment;

interface Meta {
  ip?: string;
  userAgent?: string;
}

/**
 * POST /packages/activate — activate a package from the user's Main wallet
 * balance (debit + already-active subscription). Returns the active
 * subscription and its wallet-funded payment record.
 */
export async function activatePackage(
  userId: string,
  packageId: string,
  meta?: Meta,
): Promise<{ pkg: UserPackageRow; payment: DepositRow }> {
  return activatePackageFromWallet(userId, packageId, meta);
}

/**
 * POST /packages/activate-for — an active user pays from their own Main wallet
 * to activate a package for another inactive user (the beneficiary). The actor
 * is debited; the target receives the active subscription + active status.
 */
export async function activatePackageFor(
  actorId: string,
  targetUserId: string,
  packageId: string,
  meta?: Meta,
): Promise<{ pkg: UserPackageRow; payment: DepositRow }> {
  return activatePackageFromWallet(actorId, packageId, meta, targetUserId);
}

export type { PackageTier };