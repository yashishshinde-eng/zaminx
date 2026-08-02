import { Package, UserPackage, ActivityLog } from "../models/index.js";
import { ApiError } from "../utils/ApiError.js";
import type { PackageTier, UserPackageRow } from "@zaminex/shared";

/** GET /packages — the active catalog, ordered by sort then price. */
export async function listCatalog(): Promise<PackageTier[]> {
  const tiers = await Package.find({ status: "active" }).sort({ sort: 1, priceUsd: 1 }).lean();
  return tiers.map((p) => ({
    id: p._id.toString(),
    name: p.name,
    slug: p.slug,
    description: p.description ?? undefined,
    priceUsd: p.priceUsd,
    dailyReturnPct: p.dailyReturnPct,
    durationDays: p.durationDays,
    features: p.features ?? [],
    sort: p.sort,
    status: p.status as PackageTier["status"],
  }));
}

/** GET /packages/mine — the user's subscriptions (most recent first). */
export async function getMyPackages(userId: string): Promise<UserPackageRow[]> {
  const rows = await UserPackage.find({ user: userId }).sort({ createdAt: -1 }).lean();
  return rows.map((up) => {
    const s = up.snapshot!;
    return {
    id: up._id.toString(),
    packageId: up.package.toString(),
    snapshot: {
      name: s.name,
      priceUsd: s.priceUsd,
      dailyReturnPct: s.dailyReturnPct,
      durationDays: s.durationDays,
    },
    status: up.status as UserPackageRow["status"],
    paymentStatus: up.paymentStatus as UserPackageRow["paymentStatus"],
    activatedAt: up.activatedAt instanceof Date ? up.activatedAt.toISOString() : null,
    expiresAt: up.expiresAt instanceof Date ? up.expiresAt.toISOString() : null,
    createdAt: up.createdAt instanceof Date ? up.createdAt.toISOString() : new Date().toISOString(),
  };
  });
}

/** POST /packages/activate — initiate a package activation.
 *  Creates a `pending` subscription (awaiting payment). Phase 7 wires the
 *  NOWPayments invoice + webhook that confirm it to `active`. */
export async function activatePackage(
  userId: string,
  packageId: string,
  meta?: { ip?: string; userAgent?: string },
): Promise<UserPackageRow> {
  const pkg = await Package.findOne({ _id: packageId, status: "active" });
  if (!pkg) throw ApiError.notFound("Package not found");

  // One pending/active subscription per user in Phase 6.
  const existing = await UserPackage.findOne({
    user: userId,
    status: { $in: ["pending", "active"] },
  });
  if (existing) {
    throw ApiError.conflict("You already have a pending or active package");
  }

  const subscription = await UserPackage.create({
    user: userId,
    package: pkg._id,
    snapshot: {
      name: pkg.name,
      priceUsd: pkg.priceUsd,
      dailyReturnPct: pkg.dailyReturnPct,
      durationDays: pkg.durationDays,
    },
    status: "pending",
    paymentStatus: "pending",
  });

  await ActivityLog.create({
    actor: userId,
    action: "package.activate",
    resource: "Package",
    resourceId: pkg._id.toString(),
    meta: { name: pkg.name, priceUsd: pkg.priceUsd },
    ip: meta?.ip,
    userAgent: meta?.userAgent,
  }).catch(() => undefined);

  const fresh = await UserPackage.findById(subscription._id).lean();
  if (!fresh) throw ApiError.internal("Activation could not be persisted");
  const s = fresh.snapshot!;
  return {
    id: fresh._id.toString(),
    packageId: fresh.package.toString(),
    snapshot: {
      name: s.name,
      priceUsd: s.priceUsd,
      dailyReturnPct: s.dailyReturnPct,
      durationDays: s.durationDays,
    },
    status: fresh.status as UserPackageRow["status"],
    paymentStatus: fresh.paymentStatus as UserPackageRow["paymentStatus"],
    activatedAt: fresh.activatedAt instanceof Date ? fresh.activatedAt.toISOString() : null,
    expiresAt: fresh.expiresAt instanceof Date ? fresh.expiresAt.toISOString() : null,
    createdAt: fresh.createdAt instanceof Date ? fresh.createdAt.toISOString() : new Date().toISOString(),
  };
}