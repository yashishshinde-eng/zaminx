import { P2PTransfer, User, ActivityLog } from "../models/index.js";
import { ApiError } from "../utils/ApiError.js";
import { applyLedgerEntry, getWalletBalances } from "./wallet.service.js";
import type { P2PTransferPage, P2PTransferRow, P2PTransferStatus, WalletType } from "@zeminex/shared";

/* ------------------------------------------------------------------ */
/*  Mapper                                                             */
/* ------------------------------------------------------------------ */

function toTransferRow(t: {
  _id: { toString(): string };
  fromUser: { toString(): string };
  fromUserName: string;
  toUser: { toString(): string };
  toUserName: string;
  wallet: string;
  amount: number;
  status: string;
  memo?: string | null;
  createdAt: Date;
}): P2PTransferRow {
  return {
    id: t._id.toString(),
    fromUser: t.fromUser.toString(),
    fromUserName: t.fromUserName,
    toUser: t.toUser.toString(),
    toUserName: t.toUserName,
    wallet: t.wallet as WalletType,
    amount: t.amount,
    status: t.status as P2PTransferStatus,
    memo: t.memo ?? null,
    createdAt: t.createdAt instanceof Date ? t.createdAt.toISOString() : new Date().toISOString(),
  };
}

function paginate(total: number, page: number, limit: number) {
  return { page, limit, total, totalPages: total === 0 ? 0 : Math.ceil(total / limit) };
}

/* ------------------------------------------------------------------ */
/*  Send a P2P transfer                                                */
/* ------------------------------------------------------------------ */

interface SendP2PInput {
  wallet: WalletType;
  amount: number;
  referralCode: string;
  memo?: string;
}

export async function sendP2PTransfer(
  fromUserId: string,
  input: SendP2PInput,
  meta?: { ip?: string; userAgent?: string },
): Promise<P2PTransferRow> {
  const amount = Math.round((input.amount + Number.EPSILON) * 100) / 100;
  if (amount <= 0) throw ApiError.badRequest("Amount must be greater than 0");

  // Find the recipient by referral code.
  const recipient = await User.findOne({ referralCode: input.referralCode });
  if (!recipient) throw ApiError.badRequest("Invalid referral code — no user found");
  if (recipient._id.toString() === fromUserId) throw ApiError.badRequest("You cannot send to yourself");
  if (recipient.status !== "active") throw ApiError.badRequest("Recipient account is not active");

  // Find the sender for their name.
  const sender = await User.findById(fromUserId);
  if (!sender) throw ApiError.notFound("User not found");
  if (sender.status !== "active") throw ApiError.forbidden("Your account is not active");

  // Check the sender has enough balance.
  const balances = await getWalletBalances(fromUserId);
  const walletBalance = balances[input.wallet];
  if (walletBalance.available < amount) {
    throw ApiError.badRequest(
      `Insufficient balance. Available: $${walletBalance.available.toFixed(2)} in ${input.wallet} wallet`,
    );
  }

  // Create the transfer record first (status: completed).
  const transfer = await P2PTransfer.create({
    fromUser: fromUserId,
    fromUserName: sender.name,
    toUser: recipient._id,
    toUserName: recipient.name,
    wallet: input.wallet,
    amount,
    memo: input.memo ?? null,
    status: "completed",
  });

  const transferId = transfer._id.toString();

  // Debit the sender's wallet.
  await applyLedgerEntry({
    userId: fromUserId,
    wallet: input.wallet,
    field: "available",
    direction: "debit",
    amount,
    type: "p2p_transfer_out",
    reference: { resource: "P2PTransfer", resourceId: transferId },
    memo: `P2P transfer to ${recipient.name}${input.memo ? ` — ${input.memo}` : ""}`,
  });

  // Credit the recipient's wallet.
  await applyLedgerEntry({
    userId: recipient._id.toString(),
    wallet: input.wallet,
    field: "available",
    direction: "credit",
    amount,
    type: "p2p_transfer_in",
    reference: { resource: "P2PTransfer", resourceId: transferId },
    memo: `P2P transfer from ${sender.name}${input.memo ? ` — ${input.memo}` : ""}`,
  });

  // Log activity.
  await ActivityLog.create({
    actor: fromUserId,
    action: "p2p_transfer.send",
    resource: "P2PTransfer",
    resourceId: transferId,
    ip: meta?.ip,
    userAgent: meta?.userAgent,
  }).catch(() => undefined);

  return toTransferRow(transfer.toObject());
}

/* ------------------------------------------------------------------ */
/*  List P2P transfers (sent or received by the user)                  */
/* ------------------------------------------------------------------ */

interface GetP2PTransfersArgs {
  wallet?: WalletType;
  page: number;
  limit: number;
}

export async function getP2PTransfers(
  userId: string,
  args: GetP2PTransfersArgs,
): Promise<P2PTransferPage> {
  const page = Math.max(1, args.page);
  const limit = Math.min(50, Math.max(1, args.limit));

  const filter: Record<string, unknown> = {
    $or: [{ fromUser: userId }, { toUser: userId }],
  };
  if (args.wallet) filter.wallet = args.wallet;

  const [rows, total] = await Promise.all([
    P2PTransfer.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    P2PTransfer.countDocuments(filter),
  ]);

  return {
    items: rows.map((r) => toTransferRow(r as never)),
    ...paginate(total, page, limit),
  };
}