import { Package, UserPackage, Deposit, ActivityLog, User } from "../models/index.js";
import { ApiError } from "../utils/ApiError.js";
import { logger } from "../config/logger.js";
import { sendNotificationEmail } from "./email.service.js";
import { depositSuccessTemplate } from "./emailTemplates.js";
import { createInvoice } from "./nowpayments.service.js";
import { applyLedgerEntry } from "./wallet.service.js";
import { awardDirectBonus } from "./compensation.service.js";
import type { DepositRow, PackageTier, UserPackageRow } from "@zaminex/shared";

interface Meta {
  ip?: string;
  userAgent?: string;
}

const DAY_MS = 86_400_000;

/** The non-optional payment shape joined onto a subscription row. */
type Payment = NonNullable<UserPackageRow["payment"]>;

/* ------------------------------------------------------------------ */
/*  Mappers                                                            */
/* ------------------------------------------------------------------ */

function toTier(p: {
  _id: { toString(): string };
  name: string;
  slug: string;
  description?: string | null;
  priceUsd: number;
  dailyReturnPct: number;
  durationDays: number;
  features: string[];
  sort: number;
  status: string;
}): PackageTier {
  return {
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
  };
}

type LeanUserPackage = {
  _id: { toString(): string };
  package: { toString(): string };
  snapshot: { name: string; priceUsd: number; dailyReturnPct: number; durationDays: number };
  status: string;
  paymentStatus: string;
  activatedAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
};

function toUserPackageRow(up: LeanUserPackage, payment?: UserPackageRow["payment"]): UserPackageRow {
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
    payment,
  };
}

function toDepositRow(d: {
  _id: { toString(): string };
  userPackage: { toString(): string };
  package: { toString(): string };
  amountUsd: number;
  currency: string;
  status: string;
  payAddress?: string | null;
  payAmount?: number | null;
  hostedUrl?: string | null;
  sandbox: boolean;
  createdAt: Date;
  paidAt?: Date | null;
}): DepositRow {
  return {
    id: d._id.toString(),
    userPackageId: d.userPackage.toString(),
    packageId: d.package.toString(),
    amountUsd: d.amountUsd,
    currency: d.currency as DepositRow["currency"],
    status: d.status as DepositRow["status"],
    payAddress: d.payAddress ?? null,
    payAmount: d.payAmount ?? null,
    hostedUrl: d.hostedUrl ?? null,
    sandbox: d.sandbox,
    createdAt: d.createdAt instanceof Date ? d.createdAt.toISOString() : new Date().toISOString(),
    paidAt: d.paidAt instanceof Date ? d.paidAt.toISOString() : null,
  };
}

function depositToPayment(d: {
  _id: { toString(): string };
  status: string;
  payAddress?: string | null;
  payAmount?: number | null;
  hostedUrl?: string | null;
  sandbox: boolean;
}): Payment {
  return {
    depositId: d._id.toString(),
    status: d.status as Payment["status"],
    payAddress: d.payAddress ?? null,
    payAmount: d.payAmount ?? null,
    currency: "USDT-BEP20",
    hostedUrl: d.hostedUrl ?? null,
    sandbox: d.sandbox,
  };
}

/* ------------------------------------------------------------------ */
/*  Catalog (re-exported by package.service)                          */
/* ------------------------------------------------------------------ */

export async function listCatalog(): Promise<PackageTier[]> {
  const tiers = await Package.find({ status: "active" }).sort({ sort: 1, priceUsd: 1 }).lean();
  return tiers.map(toTier);
}

/* ------------------------------------------------------------------ */
/*  Activation + payment initiation                                   */
/* ------------------------------------------------------------------ */

/**
 * Initiate a package activation: create a pending UserPackage, create a
 * NOWPayments invoice, and record the pending Deposit. Returns the pending
 * subscription plus payment instructions. Phase 7's deposit entry point.
 */
export async function initiateDeposit(
  userId: string,
  packageId: string,
  meta?: Meta,
): Promise<{ pkg: UserPackageRow; payment: DepositRow }> {
  const pkg = await Package.findOne({ _id: packageId, status: "active" });
  if (!pkg) throw ApiError.notFound("Package not found");

  // One pending/active subscription per user.
  const existing = await UserPackage.findOne({ user: userId, status: { $in: ["pending", "active"] } });
  if (existing) throw ApiError.conflict("You already have a pending or active package");

  // 1. Pending subscription (immutable term snapshot).
  const subscription = await UserPackage.create({
    user: userId,
    package: pkg._id,
    snapshot: { name: pkg.name, priceUsd: pkg.priceUsd, dailyReturnPct: pkg.dailyReturnPct, durationDays: pkg.durationDays },
    status: "pending",
    paymentStatus: "pending",
  });

  // 2. Pending deposit.
  const deposit = await Deposit.create({
    user: userId,
    userPackage: subscription._id,
    package: pkg._id,
    amountUsd: pkg.priceUsd,
    currency: "USDT-BEP20",
    status: "pending",
  });

  // 3. Create the invoice (live NOWPayments or sandbox mock).
  let invoice;
  try {
    invoice = await createInvoice({
      amountUsd: pkg.priceUsd,
      orderId: deposit._id.toString(),
      description: `${pkg.name} package activation`,
    });
  } catch (err) {
    // Roll back the pending subscription + deposit so the user can retry.
    await Promise.all([UserPackage.deleteOne({ _id: subscription._id }), Deposit.deleteOne({ _id: deposit._id })]);
    logger.error("NOWPayments invoice creation failed", { userId, error: err instanceof Error ? err.message : String(err) });
    throw ApiError.badRequest("Could not start payment. Please try again.");
  }

  // 4. Store invoice data on the deposit.
  deposit.nowpaymentsInvoiceId = invoice.nowpaymentsInvoiceId;
  deposit.payAddress = invoice.payAddress;
  deposit.payAmount = invoice.payAmount;
  deposit.hostedUrl = invoice.hostedUrl;
  deposit.sandbox = invoice.sandbox;
  await deposit.save();

  await ActivityLog.create({
    actor: userId,
    action: "package.activate",
    resource: "Package",
    resourceId: pkg._id.toString(),
    meta: { name: pkg.name, priceUsd: pkg.priceUsd, depositId: deposit._id.toString() },
    ip: meta?.ip,
    userAgent: meta?.userAgent,
  }).catch(() => undefined);

  const payment = toDepositRow(deposit.toObject());
  const pkgRow = toUserPackageRow(subscription.toObject() as never, depositToPayment(deposit.toObject()));
  return { pkg: pkgRow, payment };
}

/* ------------------------------------------------------------------ */
/*  Confirmation (webhook + dev simulate)                              */
/* ------------------------------------------------------------------ */

/**
 * Confirm a pending deposit: idempotently flip it to paid, activate the
 * associated package, log, and email. Returns the updated DepositRow, or null
 * if the deposit was already processed / not found.
 *
 * TODO(production): wrap the dual flip in a MongoDB transaction (requires a
 * replica set; standalone dev can't run transactions). Atomic per-document
 * updates + the pending-status idempotency guard keep P1 safe.
 */
export async function confirmDeposit(
  depositId: string,
  nowpaymentsPaymentId: string | null,
  meta?: Meta,
): Promise<DepositRow | null> {
  const deposit = await Deposit.findById(depositId).lean();
  if (!deposit || deposit.status !== "pending") return null;

  // 1. Idempotent atomic flip of the deposit.
  const now = new Date();
  const flipped = await Deposit.updateOne(
    { _id: deposit._id, status: "pending" },
    { $set: { status: "paid", paidAt: now, nowpaymentsPaymentId: nowpaymentsPaymentId ?? deposit.nowpaymentsPaymentId } },
  );
  if (flipped.modifiedCount === 0) return null; // raced / already processed

  // 2. Activate the package (compute expiry from the snapshotted term).
  const up = await UserPackage.findById(deposit.userPackage).lean();
  if (up) {
    const expiresAt = new Date(now.getTime() + (up.snapshot!.durationDays * DAY_MS));
    await UserPackage.updateOne(
      { _id: up._id, status: "pending" },
      { $set: { status: "active", activatedAt: now, expiresAt, paymentStatus: "paid" } },
    );
  }

  await ActivityLog.create({
    actor: deposit.user,
    action: "deposit.paid",
    resource: "Deposit",
    resourceId: deposit._id.toString(),
    meta: { amountUsd: deposit.amountUsd, packageId: deposit.package?.toString() },
    ip: meta?.ip,
    userAgent: meta?.userAgent,
  }).catch(() => undefined);

  // 3. Credit the Main wallet (immutable ledger entry). Best-effort: a ledger
  //    write failure must not break the (already-flipped) deposit confirmation
  //    — Phase 7's contract is webhook-always-200. Idempotent via the deposit id
  //    reference, so retries after a crash do not double-credit.
  const packageName = up?.snapshot?.name ?? "package";
  await applyLedgerEntry({
    userId: deposit.user.toString(),
    wallet: "main",
    field: "available",
    direction: "credit",
    amount: deposit.amountUsd,
    type: "deposit",
    reference: { resource: "Deposit", resourceId: deposit._id.toString() },
    memo: `Deposit — ${packageName} activation`,
    meta: { packageId: deposit.package?.toString() },
  }).catch((err) => {
    logger.error("Wallet credit failed for deposit", {
      depositId: deposit._id.toString(),
      error: err instanceof Error ? err.message : String(err),
    });
  });

  // 3b. Direct Connect Bonus — the buyer's sponsor earns a percentage of the
  //     package price to their bonus wallet (Phase 10). Best-effort + idempotent
  //     (keyed by the deposit id); a bonus failure must not break confirmation.
  await awardDirectBonus(
    deposit.user.toString(),
    up?.snapshot?.priceUsd ?? deposit.amountUsd,
    deposit._id.toString(),
  ).catch((err) => {
    logger.error("Direct bonus failed for deposit", {
      depositId: deposit._id.toString(),
      error: err instanceof Error ? err.message : String(err),
    });
  });

  // 4. Best-effort deposit-success email.
  const [user, pkg] = await Promise.all([
    User.findById(deposit.user).lean(),
    Package.findById(deposit.package).lean(),
  ]);
  if (user) {
    const content = depositSuccessTemplate({
      name: user.name,
      packageName: pkg?.name ?? up?.snapshot?.name ?? "your package",
      amountUsd: deposit.amountUsd,
      txId: nowpaymentsPaymentId ?? deposit.nowpaymentsInvoiceId ?? deposit._id.toString(),
    });
    await sendNotificationEmail(user, content);
  }

  const updated = await Deposit.findById(deposit._id).lean();
  return updated ? toDepositRow(updated) : null;
}

/* ------------------------------------------------------------------ */
/*  Reads                                                              */
/* ------------------------------------------------------------------ */

/** GET /payments/deposits — the user's deposits (newest first, capped). */
export async function getDeposits(userId: string): Promise<DepositRow[]> {
  const rows = await Deposit.find({ user: userId }).sort({ createdAt: -1 }).limit(100).lean();
  return rows.map(toDepositRow);
}

/** GET /payments/deposits/:id — single deposit, ownership-checked. */
export async function getDepositForUser(userId: string, depositId: string): Promise<DepositRow> {
  const d = await Deposit.findById(depositId).lean();
  if (!d) throw ApiError.notFound("Deposit not found");
  if (d.user.toString() !== userId) throw ApiError.notFound("Deposit not found"); // no leak
  return toDepositRow(d);
}

/** Find a deposit by its NOWPayments invoice id (for the IPN webhook). */
export async function findDepositByInvoice(invoiceId: string) {
  return Deposit.findOne({ nowpaymentsInvoiceId: invoiceId }).lean();
}

/** GET /packages/mine — the user's subscriptions with joined payment info. */
export async function getMyPackagesWithPayment(userId: string): Promise<UserPackageRow[]> {
  const [rows, deposits] = await Promise.all([
    UserPackage.find({ user: userId }).sort({ createdAt: -1 }).limit(200).lean(),
    Deposit.find({ user: userId }).sort({ createdAt: -1 }).limit(200).lean(),
  ]);
  // Most recent deposit per subscription → joined `payment` field.
  const paymentByPackage = new Map<string, Payment>();
  for (const d of deposits) {
    const key = d.userPackage.toString();
    if (!paymentByPackage.has(key)) paymentByPackage.set(key, depositToPayment(d));
  }
  return rows.map((up) => toUserPackageRow(up as never, paymentByPackage.get(up._id.toString())));
}