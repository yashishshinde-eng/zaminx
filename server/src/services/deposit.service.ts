import { Package, UserPackage, Deposit, ActivityLog, User } from "../models/index.js";
import { ApiError } from "../utils/ApiError.js";
import { logger } from "../config/logger.js";
import { sendNotificationEmail } from "./email.service.js";
import { depositSuccessTemplate } from "./emailTemplates.js";
import { createInvoice } from "./nowpayments.service.js";
import { applyLedgerEntry, getWalletBalances } from "./wallet.service.js";
import { awardDirectBonus } from "./compensation.service.js";
import type { DepositRow, PackageTier, UserPackageRow, WalletBalance, AdminDepositCreateBody } from "@zeminex/shared";

interface Meta {
  ip?: string;
  userAgent?: string;
}

const DAY_MS = 86_400_000;

/** A wallet-deposit payment link/address is valid for 10 minutes after
 *  creation. After that the UI marks it expired and the user must start a new
 *  deposit. A genuine late webhook can still credit real funds (see
 *  `confirmDeposit`), so expiry is a UI/UX guard, not a hard fund-loss cutoff. */
const DEPOSIT_EXPIRY_MS = 10 * 60_000;

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
  userPackage?: { toString(): string } | null;
  package?: { toString(): string } | null;
  amountUsd: number;
  currency: string;
  status: string;
  payAddress?: string | null;
  payAmount?: number | null;
  hostedUrl?: string | null;
  sandbox: boolean;
  createdAt: Date;
  paidAt?: Date | null;
  expiresAt?: Date | null;
}): DepositRow {
  return {
    id: d._id.toString(),
    userPackageId: d.userPackage?.toString() ?? null,
    packageId: d.package?.toString() ?? null,
    amountUsd: d.amountUsd,
    currency: d.currency as DepositRow["currency"],
    status: d.status as DepositRow["status"],
    payAddress: d.payAddress ?? null,
    payAmount: d.payAmount ?? null,
    hostedUrl: d.hostedUrl ?? null,
    sandbox: d.sandbox,
    createdAt: d.createdAt instanceof Date ? d.createdAt.toISOString() : new Date().toISOString(),
    paidAt: d.paidAt instanceof Date ? d.paidAt.toISOString() : null,
    expiresAt: d.expiresAt instanceof Date ? d.expiresAt.toISOString() : null,
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
/*  Wallet deposit (decoupled from any package)                        */
/* ------------------------------------------------------------------ */

/**
 * Initiate a wallet deposit: the user picks an amount, we create a pending
 * package-less Deposit and a NOWPayments invoice. The webhook (or dev simulate)
 * confirms it and credits the Main wallet — no package is created here; the
 * user activates a package separately from their wallet balance via
 * `activatePackageFromWallet`. This is the deposit-page entry point.
 */
export async function initiateWalletDeposit(
  userId: string,
  amountUsd: number,
  meta?: Meta,
): Promise<DepositRow> {
  if (!Number.isFinite(amountUsd) || amountUsd < 1) throw ApiError.badRequest("Minimum deposit is $1");

  // 1. Pending, package-less deposit (a pure wallet top-up). The payment link
  //    expires after 10 minutes — the client shows a live countdown and flips
  //    to an expired state once it elapses.
  const deposit = await Deposit.create({
    user: userId,
    userPackage: null,
    package: null,
    amountUsd,
    currency: "USDT-BEP20",
    status: "pending",
    expiresAt: new Date(Date.now() + DEPOSIT_EXPIRY_MS),
  });

  // 2. Create the invoice (live NOWPayments or sandbox mock).
  let invoice;
  try {
    invoice = await createInvoice({
      amountUsd,
      orderId: deposit._id.toString(),
      description: "Wallet deposit",
    });
  } catch (err) {
    // Roll back the pending deposit so the user can retry.
    await Deposit.deleteOne({ _id: deposit._id }).catch(() => undefined);
    logger.error("NOWPayments invoice creation failed", { userId, error: err instanceof Error ? err.message : String(err) });
    throw ApiError.badRequest("Could not start payment. Please try again.");
  }

  // 3. Store invoice data on the deposit.
  deposit.nowpaymentsInvoiceId = invoice.nowpaymentsInvoiceId;
  deposit.payAddress = invoice.payAddress;
  deposit.payAmount = invoice.payAmount;
  deposit.hostedUrl = invoice.hostedUrl;
  deposit.sandbox = invoice.sandbox;
  await deposit.save();

  await ActivityLog.create({
    actor: userId,
    action: "deposit.initiate",
    resource: "Deposit",
    resourceId: deposit._id.toString(),
    meta: { amountUsd },
    ip: meta?.ip,
    userAgent: meta?.userAgent,
  }).catch(() => undefined);

  return toDepositRow(deposit.toObject());
}

/* ------------------------------------------------------------------ */
/*  Package activation from wallet balance                             */
/* ------------------------------------------------------------------ */

/**
 * Activate a package using the user's Main wallet balance — the decoupled
 * deposit→activate flow. Debits the package price from Main/available, creates
 * an already-active UserPackage, records a paid wallet-funded Deposit for
 * history, and awards the Direct Connect Bonus to the sponsor. Replaces the
 * old package-tied NOWPayments invoice path.
 *
 * The atomic, idempotent wallet debit is the authoritative primitive: keyed by
 * the UserPackage id, so a crash between the debit and any later step is safe
 * to retry (the retry debits once). The UserPackage is created pending first so
 * its _id is available as the idempotency key, then flipped to active once the
 * debit succeeds; a failed debit rolls the pending subscription back.
 */
export async function activatePackageFromWallet(
  userId: string,
  packageId: string,
  meta?: Meta,
): Promise<{ pkg: UserPackageRow; payment: DepositRow }> {
  const pkg = await Package.findOne({ _id: packageId, status: "active" });
  if (!pkg) throw ApiError.notFound("Package not found");

  // One pending/active subscription per user.
  const existing = await UserPackage.findOne({ user: userId, status: { $in: ["pending", "active"] } });
  if (existing) throw ApiError.conflict("You already have a pending or active package");

  const price = pkg.priceUsd;

  // Pre-check the Main wallet so we can fail fast with a clear message before
  // creating any records. The authoritative guard is the atomic debit below.
  const balances = await getWalletBalances(userId);
  if (balances.main.available < price) {
    throw ApiError.conflict(`Insufficient balance — $${price} needed, deposit funds first`);
  }

  // 1. Pending subscription (gives us the idempotency key for the debit).
  const subscription = await UserPackage.create({
    user: userId,
    package: pkg._id,
    snapshot: { name: pkg.name, priceUsd: pkg.priceUsd, dailyReturnPct: pkg.dailyReturnPct, durationDays: pkg.durationDays },
    status: "pending",
    paymentStatus: "pending",
  });

  // 2. Atomic, idempotent debit of the package price from Main/available. The
  //    `$gte` guard prevents an over-debit; if it fails, roll back the pending
  //    subscription and surface a conflict.
  try {
    await applyLedgerEntry({
      userId,
      wallet: "main",
      field: "available",
      direction: "debit",
      amount: price,
      type: "package_activation",
      reference: { resource: "UserPackage", resourceId: subscription._id.toString() },
      memo: `Package activation — ${pkg.name}`,
      meta: { packageId: pkg._id.toString() },
    });
  } catch (err) {
    await UserPackage.deleteOne({ _id: subscription._id }).catch(() => undefined);
    if (err instanceof ApiError && err.statusCode === 409) {
      throw ApiError.conflict(`Insufficient balance — $${price} needed, deposit funds first`);
    }
    logger.error("Wallet debit failed for package activation", { userId, packageId, error: err instanceof Error ? err.message : String(err) });
    throw ApiError.internal("Could not activate package. Please try again.");
  }

  // 3. Flip the subscription to active (compute expiry from the snapshotted
  //    term). durationDays === 0 means LIFETIME → expiresAt stays null.
  const now = new Date();
  const termDays = pkg.durationDays;
  const expiresAt = termDays > 0 ? new Date(now.getTime() + termDays * DAY_MS) : null;
  await UserPackage.updateOne(
    { _id: subscription._id, status: "pending" },
    { $set: { status: "active", activatedAt: now, expiresAt, paymentStatus: "paid", paymentId: `wallet-${subscription._id}` } },
  );

  // 4. Record a paid, wallet-funded Deposit so the activation appears in the
  //    user's deposit history and the package row's joined `payment` info.
  const deposit = await Deposit.create({
    user: userId,
    userPackage: subscription._id,
    package: pkg._id,
    amountUsd: price,
    currency: "USDT-BEP20",
    status: "paid",
    paidAt: now,
    sandbox: false,
    meta: { method: "wallet", packageId: pkg._id.toString() },
  });

  await ActivityLog.create({
    actor: userId,
    action: "package.activate",
    resource: "Package",
    resourceId: pkg._id.toString(),
    meta: { name: pkg.name, priceUsd: price, depositId: deposit._id.toString(), method: "wallet" },
    ip: meta?.ip,
    userAgent: meta?.userAgent,
  }).catch(() => undefined);

  // 5. Direct Connect Bonus — the buyer's sponsor earns a percentage of the
  //    package price to their bonus wallet. Best-effort + idempotent (keyed by
  //    the deposit id); a bonus failure must not break the activation.
  await awardDirectBonus(userId, price, deposit._id.toString()).catch((err) => {
    logger.error("Direct bonus failed for wallet activation", {
      userId, packageId, depositId: deposit._id.toString(),
      error: err instanceof Error ? err.message : String(err),
    });
  });

  const updatedUp = await UserPackage.findById(subscription._id).lean();
  const pkgRow = toUserPackageRow(updatedUp as never, depositToPayment(deposit.toObject()));
  return { pkg: pkgRow, payment: toDepositRow(deposit.toObject()) };
}

/* ------------------------------------------------------------------ */
/*  Confirmation (webhook + dev simulate)                              */
/* ------------------------------------------------------------------ */

/**
 * Confirm a pending deposit: idempotently flip it to paid, credit the Main
 * wallet, and — for package-tied deposits only — activate the associated
 * UserPackage and award the Direct Connect Bonus. Wallet-only deposits (no
 * `userPackage`) just credit the wallet; the package is activated separately
 * from the wallet balance via `activatePackageFromWallet`. Returns the updated
 * DepositRow, or null if the deposit was already processed / not found.
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
  // Accept a late confirmation on an expired deposit too — the 10-minute expiry
  // is a UI guard, not a reason to lose a user's real funds. A paid/failed
  // deposit is a no-op (idempotent). `waiting`/`confirmed` webhook retries race
  // safely against the atomic status flip below.
  if (!deposit || (deposit.status !== "pending" && deposit.status !== "expired")) return null;

  // 1. Idempotent atomic flip of the deposit.
  const now = new Date();
  const flipped = await Deposit.updateOne(
    { _id: deposit._id, status: { $in: ["pending", "expired"] } },
    { $set: { status: "paid", paidAt: now, nowpaymentsPaymentId: nowpaymentsPaymentId ?? deposit.nowpaymentsPaymentId } },
  );
  if (flipped.modifiedCount === 0) return null; // raced / already processed

  // 2. Activate the package (compute expiry from the snapshotted term).
  //    durationDays === 0 means LIFETIME → expiresAt stays null (never expires).
  const up = await UserPackage.findById(deposit.userPackage).lean();
  if (up) {
    const termDays = up.snapshot!.durationDays;
    const expiresAt = termDays > 0 ? new Date(now.getTime() + termDays * DAY_MS) : null;
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
  //     package price to their bonus wallet (Phase 10). Only package-tied
  //     deposits award a bonus; a pure wallet top-up (no userPackage) does not —
  //     the bonus is awarded when the package is activated from the wallet in
  //     `activatePackageFromWallet`. Best-effort + idempotent (keyed by the
  //     deposit id); a bonus failure must not break confirmation.
  if (up) {
    await awardDirectBonus(
      deposit.user.toString(),
      up.snapshot!.priceUsd,
      deposit._id.toString(),
    ).catch((err) => {
      logger.error("Direct bonus failed for deposit", {
        depositId: deposit._id.toString(),
        error: err instanceof Error ? err.message : String(err),
      });
    });
  }

  // 4. Best-effort deposit-success email.
  const [user, pkg] = await Promise.all([
    User.findById(deposit.user).lean(),
    Package.findById(deposit.package).lean(),
  ]);
  if (user) {
    const content = depositSuccessTemplate({
      name: user.name,
      packageName: pkg?.name ?? up?.snapshot?.name ?? "Wallet deposit",
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

  // Lazily expire a pending wallet deposit whose 10-minute window has elapsed.
  // The atomic `status: "pending"` guard makes this safe against a racing
  // webhook confirmation (which would win and credit the deposit instead).
  if (d.status === "pending" && d.expiresAt instanceof Date && d.expiresAt.getTime() <= Date.now()) {
    await Deposit.updateOne({ _id: d._id, status: "pending" }, { $set: { status: "expired" } }).catch(() => undefined);
    return toDepositRow({ ...d, status: "expired" });
  }

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
  // Admin-recorded standalone deposits (no userPackage) don't belong to any
  // subscription, so skip them here.
  const paymentByPackage = new Map<string, Payment>();
  for (const d of deposits) {
    const key = d.userPackage?.toString();
    if (!key) continue;
    if (!paymentByPackage.has(key)) paymentByPackage.set(key, depositToPayment(d));
  }
  return rows.map((up) => toUserPackageRow(up as never, paymentByPackage.get(up._id.toString())));
}

/* ------------------------------------------------------------------ */
/*  Admin manual deposit                                               */
/* ------------------------------------------------------------------ */

/**
 * POST /admin/users/:id/deposits — an admin records a paid, package-less
 * deposit for a user and credits their Main/available wallet as a `deposit`
 * ledger row. Unlike `confirmDeposit`, this is not tied to a package
 * activation and does not award the Direct Connect Bonus; it's a pure wallet
 * credit that also creates a `Deposit` record so it appears in the user's
 * deposit history alongside real NOWPayments deposits.
 *
 * The ledger credit is idempotent via the deposit id reference, so a crash
 * between the `Deposit.create` and the ledger write is safe to retry (the
 * retry credits once, keyed by the deposit id). No DB transaction (Phase 15
 * TODO); same atomic-per-doc + idempotency-guard contract as `confirmDeposit`.
 */
export async function adminRecordDeposit(
  adminId: string,
  userId: string,
  body: AdminDepositCreateBody,
): Promise<{ deposit: DepositRow; balance: WalletBalance }> {
  const now = new Date();

  // 1. Create the paid, package-less deposit record.
  const deposit = await Deposit.create({
    user: userId,
    userPackage: null,
    package: null,
    amountUsd: body.amount,
    currency: "USDT-BEP20",
    status: "paid",
    paidAt: now,
    sandbox: false,
    meta: { adminId, method: "manual_admin", reference: body.memo ?? null },
  });

  // 2. Credit the Main wallet (immutable `deposit` ledger row, idempotent via
  //    the deposit id). Best-effort: a ledger failure must not orphan the
  //    already-created deposit — log and surface a non-2xx so the admin can
  //    retry; the idempotency guard prevents a double-credit on retry.
  const result = await applyLedgerEntry({
    userId,
    wallet: "main",
    field: "available",
    direction: "credit",
    amount: body.amount,
    type: "deposit",
    reference: { resource: "Deposit", resourceId: deposit._id.toString() },
    memo: body.memo ? `Admin deposit — ${body.memo}` : "Admin deposit",
    meta: { adminId, depositId: deposit._id.toString() },
  }).catch((err) => {
    logger.error("Wallet credit failed for admin deposit", {
      depositId: deposit._id.toString(),
      userId,
      error: err instanceof Error ? err.message : String(err),
    });
    throw ApiError.internal("Deposit recorded but wallet credit failed — please retry to reconcile");
  });

  // 3. Audit log (best-effort).
  await ActivityLog.create({
    actor: adminId,
    action: "deposit.admin_create",
    resource: "Deposit",
    resourceId: deposit._id.toString(),
    meta: { amountUsd: body.amount, userId, memo: body.memo ?? null },
  }).catch(() => undefined);

  return { deposit: toDepositRow(deposit.toObject()), balance: result.balance };
}