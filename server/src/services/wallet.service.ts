import { Wallet, WalletTransaction } from "../models/index.js";
import { ApiError } from "../utils/ApiError.js";
import type {
  WalletBalance,
  WalletBalances,
  WalletBalanceField,
  WalletLedgerPage,
  WalletTxDirection,
  WalletTxRef,
  WalletTxRow,
  WalletTxType,
  WalletType,
} from "@zaminex/shared";

/* ------------------------------------------------------------------ */
/*  Ensure + read                                                      */
/* ------------------------------------------------------------------ */

const ZERO_WALLET: WalletBalance = { available: 0, onHold: 0 };

/** Idempotently create the user's Wallet doc (zero balances) if it is missing. */
export async function ensureWallet(userId: string): Promise<void> {
  await Wallet.findOneAndUpdate(
    { user: userId },
    { $setOnInsert: { user: userId, balances: { main: { ...ZERO_WALLET }, bonus: { ...ZERO_WALLET }, trading: { ...ZERO_WALLET } } } },
    { upsert: true },
  );
}

function toBalance(b: { available?: number; onHold?: number } | null | undefined): WalletBalance {
  return { available: b?.available ?? 0, onHold: b?.onHold ?? 0 };
}

/** `GET /wallet` — the three wallet balances + rolled-up totals. */
export async function getWalletBalances(userId: string): Promise<WalletBalances> {
  await ensureWallet(userId);
  const w = await Wallet.findOne({ user: userId }).lean();
  const balances = w?.balances as
    | { main?: { available?: number; onHold?: number }; bonus?: { available?: number; onHold?: number }; trading?: { available?: number; onHold?: number } }
    | undefined;
  const main = toBalance(balances?.main);
  const bonus = toBalance(balances?.bonus);
  const trading = toBalance(balances?.trading);
  const totalAvailable = main.available + bonus.available + trading.available;
  const totalOnHold = main.onHold + bonus.onHold + trading.onHold;
  return { main, bonus, trading, totalAvailable, totalOnHold, total: totalAvailable + totalOnHold };
}

/* ------------------------------------------------------------------ */
/*  The ledger primitive — one atomic credit/debit + append           */
/* ------------------------------------------------------------------ */

export interface ApplyLedgerEntryArgs {
  userId: string;
  wallet: WalletType;
  /** Which balance field to move. Defaults to `available`. */
  field?: WalletBalanceField;
  direction: WalletTxDirection;
  amount: number;
  type: WalletTxType;
  reference?: WalletTxRef | null;
  memo?: string | null;
  meta?: Record<string, unknown> | null;
}

export interface ApplyLedgerEntryResult {
  wallet: WalletType;
  balance: WalletBalance;
  /** The created ledger row (or the pre-existing one on an idempotent no-op). */
  tx: WalletTxRow | null;
}

/**
 * Apply a single credit/debit to a wallet balance atomically and append an
 * immutable ledger row. Idempotent when `reference.resourceId` is set: if a row
 * already exists for (user, type, resourceId) it is returned without re-applying.
 *
 * TODO(production): wrap the `$inc` + ledger `create` in a MongoDB transaction
 * (Phase 15 / replica set). Standalone dev can't run transactions; the atomic
 * per-document `$inc` (with a debit guard preventing negative balances) keeps
 * the balance correct, and the idempotency guard makes retries safe. The
 * residual crash-gap between the `$inc` and the ledger insert is accepted for
 * dev and resolved by the Phase 15 transaction.
 */
export async function applyLedgerEntry(args: ApplyLedgerEntryArgs): Promise<ApplyLedgerEntryResult> {
  const { userId, wallet, direction, amount, type } = args;
  const field: WalletBalanceField = args.field ?? "available";

  if (amount <= 0) throw ApiError.badRequest("Amount must be positive");

  // 1. Idempotency guard (defense-in-depth): if this event was already recorded,
  //    return it without re-applying. Lets callers retry safely after a crash.
  const resourceId = args.reference?.resourceId ?? null;
  let existing: WalletTxRow | null = null;
  if (resourceId) {
    const prior = await WalletTransaction.findOne({ user: userId, type, "reference.resourceId": resourceId }).lean();
    if (prior) existing = toTxRow(prior);
  }
  if (existing) return { wallet, balance: (await getWalletBalances(userId))[wallet], tx: existing };

  // 2. Ensure the wallet doc exists, then atomically $inc the target field.
  await ensureWallet(userId);
  const path = `balances.${wallet}.${field}`;
  const filter = direction === "debit" ? { user: userId, [path]: { $gte: amount } } : { user: userId };
  const delta = direction === "credit" ? amount : -amount;
  const updated = await Wallet.findOneAndUpdate(filter, { $inc: { [path]: delta } }, { new: true }).lean();
  if (!updated) throw ApiError.conflict("Insufficient balance");

  const b = (updated.balances as Record<WalletType, WalletBalance>)[wallet];
  const availableAfter = b?.available ?? 0;
  const onHoldAfter = b?.onHold ?? 0;

  // 3. Append the immutable ledger row.
  const created = await WalletTransaction.create({
    user: userId,
    wallet,
    type,
    direction,
    field,
    amount,
    availableAfter,
    onHoldAfter,
    reference: { resource: args.reference?.resource ?? null, resourceId },
    memo: args.memo ?? null,
    meta: args.meta ?? {},
  });

  return { wallet, balance: { available: availableAfter, onHold: onHoldAfter }, tx: toTxRow(created.toObject()) };
}

export interface ApplyLedgerMoveArgs {
  userId: string;
  wallet: WalletType;
  amount: number;
  /** Field to debit (e.g. "available" for a hold, "onHold" for a release). */
  fromField: WalletBalanceField;
  /** Field to credit (e.g. "onHold" for a hold, "available" for a release). */
  toField: WalletBalanceField;
  type: WalletTxType;
  reference?: WalletTxRef | null;
  memo?: string | null;
  meta?: Record<string, unknown> | null;
}

export interface ApplyLedgerMoveResult {
  wallet: WalletType;
  balance: WalletBalance;
  txs: WalletTxRow[];
}

/**
 * Move funds between the two balance fields of a wallet atomically, appending
 * two ledger rows (a debit on `fromField` and a credit on `toField`). Used by
 * Phase 8A withdrawals: `withdrawal_hold` (available→onHold) and
 * `withdrawal_release` (onHold→available).
 *
 * The balance move is a **single atomic two-field `$inc`** (no crash-gap between
 * the legs) guarded so `fromField` cannot go negative; only the two ledger
 * appends are non-transactional, and the move is idempotent via the
 * `fromField`-debit reference guard. Phase 15 wraps the whole thing in a
 * transaction on the production replica set.
 */
export async function applyLedgerMove(args: ApplyLedgerMoveArgs): Promise<ApplyLedgerMoveResult> {
  const { userId, wallet, amount, fromField, toField, type } = args;
  if (amount <= 0) throw ApiError.badRequest("Amount must be positive");

  const resourceId = args.reference?.resourceId ?? null;

  // 1. Idempotency guard: if the debit leg already exists, the move was applied.
  if (resourceId) {
    const prior = await WalletTransaction.findOne({
      user: userId,
      type,
      "reference.resourceId": resourceId,
      field: fromField,
      direction: "debit",
    }).lean();
    if (prior) {
      const balances = await getWalletBalances(userId);
      return { wallet, balance: balances[wallet], txs: [toTxRow(prior)] };
    }
  }

  // 2. Atomic two-field move with a guard preventing a negative `fromField`.
  await ensureWallet(userId);
  const fromPath = `balances.${wallet}.${fromField}`;
  const toPath = `balances.${wallet}.${toField}`;
  const updated = await Wallet.findOneAndUpdate(
    { user: userId, [fromPath]: { $gte: amount } },
    { $inc: { [fromPath]: -amount, [toPath]: amount } },
    { new: true },
  ).lean();
  if (!updated) throw ApiError.conflict("Insufficient balance");

  const b = (updated.balances as Record<WalletType, WalletBalance>)[wallet];
  const availableAfter = b?.available ?? 0;
  const onHoldAfter = b?.onHold ?? 0;

  // 3. Append the two immutable ledger rows (both share the post-move snapshot).
  const base = {
    user: userId,
    wallet,
    type,
    amount,
    availableAfter,
    onHoldAfter,
    reference: { resource: args.reference?.resource ?? null, resourceId },
    memo: args.memo ?? null,
    meta: args.meta ?? {},
  };
  const [debit, credit] = await Promise.all([
    WalletTransaction.create({ ...base, direction: "debit", field: fromField }),
    WalletTransaction.create({ ...base, direction: "credit", field: toField }),
  ]);

  return {
    wallet,
    balance: { available: availableAfter, onHold: onHoldAfter },
    txs: [toTxRow(debit.toObject()), toTxRow(credit.toObject())],
  };
}

/* ------------------------------------------------------------------ */
/*  Ledger reads (history)                                             */
/* ------------------------------------------------------------------ */

export interface GetWalletLedgerArgs {
  wallet?: WalletType;
  type?: string;
  q?: string;
  page: number;
  limit: number;
}

function toTxRow(d: {
  _id: { toString(): string };
  wallet: string;
  type: string;
  direction: string;
  amount: number;
  availableAfter: number;
  onHoldAfter: number;
  reference?: { resource?: string | null; resourceId?: string | null } | null;
  memo?: string | null;
  createdAt: Date;
}): WalletTxRow {
  return {
    id: d._id.toString(),
    wallet: d.wallet as WalletType,
    type: d.type as WalletTxType,
    direction: d.direction as WalletTxDirection,
    amount: d.amount,
    availableAfter: d.availableAfter,
    onHoldAfter: d.onHoldAfter,
    reference: {
      resource: d.reference?.resource ?? null,
      resourceId: d.reference?.resourceId ?? null,
    },
    memo: d.memo ?? null,
    createdAt: d.createdAt instanceof Date ? d.createdAt.toISOString() : new Date().toISOString(),
  };
}

/** `GET /wallet/ledger` — paginated, filterable wallet history (newest first). */
export async function getWalletLedger(userId: string, args: GetWalletLedgerArgs): Promise<WalletLedgerPage> {
  const page = Math.max(1, args.page);
  const limit = Math.min(50, Math.max(1, args.limit));

  const filter: Record<string, unknown> = { user: userId };
  if (args.wallet) filter.wallet = args.wallet;
  if (args.type) filter.type = args.type;
  if (args.q) filter.memo = { $regex: args.q, $options: "i" };

  const [rows, total] = await Promise.all([
    WalletTransaction.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    WalletTransaction.countDocuments(filter),
  ]);

  return {
    items: rows.map((r) => toTxRow(r as never)),
    page,
    limit,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / limit),
  };
}