import { Withdrawal, User, ActivityLog } from "../models/index.js";
import { ApiError } from "../utils/ApiError.js";
import { verifyTransactionPassword } from "../utils/transactionPin.js";
import { logger } from "../config/logger.js";
import { applyLedgerMove, applyLedgerEntry, getWalletBalances } from "./wallet.service.js";
import { sendNotificationEmail } from "./email.service.js";
import { withdrawalUpdateTemplate } from "./emailTemplates.js";
import type { WithdrawalPage, WithdrawalRow, WithdrawalStatus, WalletType } from "@zeminex/shared";

/** Minimum withdrawal in USD. Phase 14 will make this admin-configurable. */
export const MIN_WITHDRAWAL_USD = 15;

interface Meta {
  ip?: string;
  userAgent?: string;
}

/* ------------------------------------------------------------------ */
/*  Mapper                                                             */
/* ------------------------------------------------------------------ */

function toWithdrawalRow(w: {
  _id: { toString(): string };
  user: { toString(): string };
  wallet: string;
  amount: number;
  currency: string;
  address: string;
  status: string;
  remarks?: string | null;
  processedBy?: { toString(): string } | null;
  processedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): WithdrawalRow {
  return {
    id: w._id.toString(),
    wallet: w.wallet as WalletType,
    amount: w.amount,
    currency: w.currency as WithdrawalRow["currency"],
    address: w.address,
    status: w.status as WithdrawalStatus,
    remarks: w.remarks ?? null,
    processedBy: w.processedBy ? w.processedBy.toString() : null,
    processedAt: w.processedAt instanceof Date ? w.processedAt.toISOString() : null,
    createdAt: w.createdAt instanceof Date ? w.createdAt.toISOString() : new Date().toISOString(),
    updatedAt: w.updatedAt instanceof Date ? w.updatedAt.toISOString() : new Date().toISOString(),
  };
}

function paginate(total: number, page: number, limit: number) {
  return { page, limit, total, totalPages: total === 0 ? 0 : Math.ceil(total / limit) };
}

/* ------------------------------------------------------------------ */
/*  User: submit / list / detail / cancel                              */
/* ------------------------------------------------------------------ */

/**
 * Submit a withdrawal: validate the address + amount, move `available → onHold`
 * (immutable ledger entry), then auto-approve by permanently debiting `onHold`
 * (`withdrawal_paid`) and marking the request `paid`. The on-chain USDT payout
 * is a deferred, manual fulfillment step — the row is born `paid` so the user's
 * balance reflects the withdrawal immediately. The atomic hold guard is the
 * source of truth for sufficiency; if it fails (a concurrent op drained
 * `available` after the soft pre-check), the just-created request is rolled
 * back so the user can retry.
 */
export async function submitWithdrawal(
  userId: string,
  input: { wallet: WalletType; amount: number; transactionPassword: string },
  meta?: Meta,
): Promise<WithdrawalRow> {
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound("User not found");

  // Authorise the withdrawal with the 4-digit transaction PIN before any
  // balance check or ledger move.
  await verifyTransactionPassword(userId, input.transactionPassword);

  const address = user.walletAddresses?.usdtBep20?.trim();
  if (!address) throw ApiError.badRequest("Add a USDT-BEP20 withdrawal address in Settings first");

  const amount = Math.round((input.amount + Number.EPSILON) * 100) / 100;
  if (amount < MIN_WITHDRAWAL_USD) throw ApiError.badRequest(`Minimum withdrawal is $${MIN_WITHDRAWAL_USD}`);

  // Soft pre-check for a friendly error before creating anything.
  const balances = await getWalletBalances(userId);
  if (balances[input.wallet].available < amount) {
    throw ApiError.badRequest("Insufficient available balance");
  }

  // 1. Create the request as already paid (auto-approved; on-chain payout is
  //    a deferred manual fulfillment step, not a balance movement).
  const now = new Date();
  const request = await Withdrawal.create({
    user: userId,
    wallet: input.wallet,
    amount,
    currency: "USDT-BEP20",
    address,
    status: "paid",
    processedAt: now,
    remarks: "Auto-approved — pending on-chain payout",
  });

  // 2. Move available → onHold (atomic, idempotent via the request id).
  try {
    await applyLedgerMove({
      userId,
      wallet: input.wallet,
      amount,
      fromField: "available",
      toField: "onHold",
      type: "withdrawal_hold",
      reference: { resource: "Withdrawal", resourceId: request._id.toString() },
      memo: `Withdrawal request`,
    });
  } catch (err) {
    // Insufficient at hold time (race) — roll back the request and rethrow.
    await Withdrawal.deleteOne({ _id: request._id }).catch(() => undefined);
    logger.warn("Withdrawal hold failed; request rolled back", {
      userId,
      requestId: request._id.toString(),
      error: err instanceof Error ? err.message : String(err),
    });
    throw ApiError.conflict("Insufficient available balance");
  }

  // 3. Auto-approve: permanently debit onHold (idempotent via the request id),
  //    mirroring `markPaidWithdrawal`. A debit failure here is logged but does
  //    not unwind the hold — the row stays `paid` and ops reconcile manually.
  await applyLedgerEntry({
    userId,
    wallet: input.wallet,
    field: "onHold",
    direction: "debit",
    amount,
    type: "withdrawal_paid",
    reference: { resource: "Withdrawal", resourceId: request._id.toString() },
    memo: "Withdrawal paid (auto-approved)",
  }).catch((err) => {
    logger.error("Withdrawal auto-pay debit failed; onHold left funded for manual reconciliation", {
      userId,
      requestId: request._id.toString(),
      error: err instanceof Error ? err.message : String(err),
    });
  });

  await ActivityLog.create({
    actor: userId,
    action: "withdrawal.submit",
    resource: "Withdrawal",
    resourceId: request._id.toString(),
    meta: { wallet: input.wallet, amount },
    ip: meta?.ip,
    userAgent: meta?.userAgent,
  }).catch(() => undefined);
  await ActivityLog.create({
    actor: userId,
    action: "withdrawal.pay",
    resource: "Withdrawal",
    resourceId: request._id.toString(),
    meta: { wallet: input.wallet, amount, autoApproved: true },
    ip: meta?.ip,
    userAgent: meta?.userAgent,
  }).catch(() => undefined);

  // Best-effort paid email (gated on the user's email preference).
  await sendNotificationEmail(
    user,
    withdrawalUpdateTemplate({
      name: user.name,
      status: "paid",
      amount,
      currency: "USDT-BEP20",
      wallet: input.wallet,
      address,
      remarks: "Auto-approved — pending on-chain payout",
    }),
  ).catch(() => undefined);

  const updated = await Withdrawal.findById(request._id).lean();
  return toWithdrawalRow(updated as never);
}

/** GET /withdrawals — the user's withdrawals (newest first). */
export async function getWithdrawals(
  userId: string,
  args: { status?: WithdrawalStatus; page: number; limit: number },
): Promise<WithdrawalPage> {
  const page = Math.max(1, args.page);
  const limit = Math.min(50, Math.max(1, args.limit));
  const filter: Record<string, unknown> = { user: userId };
  if (args.status) filter.status = args.status;
  const [rows, total] = await Promise.all([
    Withdrawal.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Withdrawal.countDocuments(filter),
  ]);
  return { items: rows.map((r) => toWithdrawalRow(r as never)), ...paginate(total, page, limit) };
}

/** GET /withdrawals/:id — single, ownership-checked (404 no-leak). */
export async function getWithdrawalForUser(userId: string, id: string): Promise<WithdrawalRow> {
  const w = await Withdrawal.findById(id).lean();
  if (!w || w.user.toString() !== userId) throw ApiError.notFound("Withdrawal not found");
  return toWithdrawalRow(w as never);
}

/** POST /withdrawals/:id/cancel — user cancel (pending/under_review only). */
export async function cancelWithdrawal(userId: string, id: string, meta?: Meta): Promise<WithdrawalRow> {
  const w = await Withdrawal.findById(id).lean();
  if (!w || w.user.toString() !== userId) throw ApiError.notFound("Withdrawal not found");
  if (w.status !== "pending" && w.status !== "under_review") {
    throw ApiError.conflict(`Cannot cancel a ${w.status} withdrawal`);
  }

  // Return funds onHold → available (idempotent via the request id).
  await applyLedgerMove({
    userId,
    wallet: w.wallet as WalletType,
    amount: w.amount,
    fromField: "onHold",
    toField: "available",
    type: "withdrawal_release",
    reference: { resource: "Withdrawal", resourceId: w._id.toString() },
    memo: "Withdrawal cancelled",
  });

  await Withdrawal.updateOne({ _id: id, status: { $in: ["pending", "under_review"] } }, {
    $set: { status: "cancelled", processedBy: userId, processedAt: new Date(), remarks: "Cancelled by user" },
  });

  await ActivityLog.create({
    actor: userId,
    action: "withdrawal.cancel",
    resource: "Withdrawal",
    resourceId: id,
    meta: { amount: w.amount, wallet: w.wallet },
    ip: meta?.ip,
    userAgent: meta?.userAgent,
  }).catch(() => undefined);

  // Best-effort cancellation email (gated on the user's email preference).
  const cancelUser = await User.findById(w.user).lean();
  if (cancelUser) {
    await sendNotificationEmail(
      cancelUser,
      withdrawalUpdateTemplate({
        name: cancelUser.name,
        status: "cancelled",
        amount: w.amount,
        currency: w.currency,
        wallet: w.wallet,
        address: w.address,
        remarks: "Cancelled by user",
      }),
    );
  }

  const updated = await Withdrawal.findById(id).lean();
  return toWithdrawalRow(updated as never);
}

/* ------------------------------------------------------------------ */
/*  Admin: review / approve / reject / mark paid + reads              */
/* ------------------------------------------------------------------ */

interface TransitionArgs {
  adminId: string;
  id: string;
  fromStatuses: WithdrawalStatus[];
  toStatus: WithdrawalStatus;
  action: string;
  remarks?: string;
  /** Optional funds movement to apply (idempotent, before the status flip). */
  move?: (w: { _id: { toString(): string }; wallet: string; amount: number; user: { toString(): string } }) => Promise<void>;
}

async function adminTransition({ adminId, id, fromStatuses, toStatus, action, remarks, move }: TransitionArgs): Promise<WithdrawalRow> {
  const w = await Withdrawal.findById(id).lean();
  if (!w) throw ApiError.notFound("Withdrawal not found");

  // Idempotent: already in the target state.
  if (w.status === toStatus) return toWithdrawalRow(w as never);
  if (!fromStatuses.includes(w.status as WithdrawalStatus)) {
    throw ApiError.conflict(`Cannot ${action} a ${w.status} withdrawal`);
  }

  // Apply the funds movement first (idempotent + guarded); then flip status.
  if (move) await move(w as never);

  const now = new Date();
  const res = await Withdrawal.updateOne(
    { _id: id, status: { $in: fromStatuses } },
    { $set: { status: toStatus, processedBy: adminId, processedAt: now, remarks: remarks ?? null } },
  );
  if (res.modifiedCount === 0) {
    // Raced to a different terminal state by another admin — reload + report.
    const cur = await Withdrawal.findById(id).lean();
    throw ApiError.conflict(`Withdrawal is now ${cur?.status ?? "unknown"}`);
  }

  await ActivityLog.create({
    actor: adminId,
    action: `withdrawal.${action}`,
    resource: "Withdrawal",
    resourceId: id,
    meta: { from: w.status, to: toStatus, remarks: remarks ?? null },
  }).catch(() => undefined);

  // Best-effort status email for the user-visible outcomes (review is internal).
  if (toStatus === "approved" || toStatus === "rejected" || toStatus === "paid") {
    const owner = await User.findById(w.user).lean();
    if (owner) {
      await sendNotificationEmail(
        owner,
        withdrawalUpdateTemplate({
          name: owner.name,
          status: toStatus,
          amount: w.amount,
          currency: w.currency,
          wallet: w.wallet,
          address: w.address,
          remarks: remarks ?? undefined,
        }),
      );
    }
  }

  const updated = await Withdrawal.findById(id).lean();
  return toWithdrawalRow(updated as never);
}

/** POST /withdrawals/admin/:id/review — pending → under_review (no funds move). */
export function reviewWithdrawal(adminId: string, id: string, remarks?: string): Promise<WithdrawalRow> {
  return adminTransition({ adminId, id, fromStatuses: ["pending"], toStatus: "under_review", action: "review", remarks });
}

/** POST /withdrawals/admin/:id/approve — pending|under_review → approved (no funds move). */
export function approveWithdrawal(adminId: string, id: string, remarks?: string): Promise<WithdrawalRow> {
  return adminTransition({ adminId, id, fromStatuses: ["pending", "under_review"], toStatus: "approved", action: "approve", remarks });
}

/** POST /withdrawals/admin/:id/reject — → rejected; return onHold → available. */
export function rejectWithdrawal(adminId: string, id: string, remarks?: string): Promise<WithdrawalRow> {
  return adminTransition({
    adminId, id, fromStatuses: ["pending", "under_review", "approved"], toStatus: "rejected", action: "reject", remarks,
    move: async (w) => {
      await applyLedgerMove({
        userId: w.user.toString(),
        wallet: w.wallet as WalletType,
        amount: w.amount,
        fromField: "onHold",
        toField: "available",
        type: "withdrawal_release",
        reference: { resource: "Withdrawal", resourceId: w._id.toString() },
        memo: "Withdrawal rejected",
      });
    },
  });
}

/** POST /withdrawals/admin/:id/pay — approved → paid; permanently deduct onHold. */
export function markPaidWithdrawal(adminId: string, id: string, remarks?: string): Promise<WithdrawalRow> {
  return adminTransition({
    adminId, id, fromStatuses: ["approved"], toStatus: "paid", action: "pay", remarks,
    move: async (w) => {
      await applyLedgerEntry({
        userId: w.user.toString(),
        wallet: w.wallet as WalletType,
        field: "onHold",
        direction: "debit",
        amount: w.amount,
        type: "withdrawal_paid",
        reference: { resource: "Withdrawal", resourceId: w._id.toString() },
        memo: "Withdrawal paid",
      });
    },
  });
}

/** GET /withdrawals/admin — all withdrawals (admin). */
export async function getAdminWithdrawals(args: { status?: WithdrawalStatus; page: number; limit: number }): Promise<WithdrawalPage> {
  const page = Math.max(1, args.page);
  const limit = Math.min(50, Math.max(1, args.limit));
  const filter: Record<string, unknown> = {};
  if (args.status) filter.status = args.status;
  const [rows, total] = await Promise.all([
    Withdrawal.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Withdrawal.countDocuments(filter),
  ]);
  return { items: rows.map((r) => toWithdrawalRow(r as never)), ...paginate(total, page, limit) };
}

/** GET /withdrawals/admin/:id — any withdrawal (admin). */
export async function getAdminWithdrawal(id: string): Promise<WithdrawalRow> {
  const w = await Withdrawal.findById(id).lean();
  if (!w) throw ApiError.notFound("Withdrawal not found");
  return toWithdrawalRow(w as never);
}