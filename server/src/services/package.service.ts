/**
 * Package service — thin facade over the catalog + deposit services.
 *
 * Phase 6 owned the catalog and bare activation; Phase 7 moved activation +
 * payment into the deposit service (NOWPayments). This module keeps the
 * stable `listCatalog` / `getMyPackages` / `activatePackage` exports the
 * controller relies on while delegating the payment-heavy work to deposit.
 */
import { initiateDeposit, getMyPackagesWithPayment, listCatalog as listCatalogImpl } from "./deposit.service.js";
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
 * POST /packages/activate — initiate a package activation (Phase 7: also
 * creates the NOWPayments invoice + pending deposit). Returns the pending
 * subscription and its payment instructions.
 */
export async function activatePackage(
  userId: string,
  packageId: string,
  meta?: Meta,
): Promise<{ pkg: UserPackageRow; payment: DepositRow }> {
  return initiateDeposit(userId, packageId, meta);
}

export type { PackageTier };