import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { ApiError } from "../utils/ApiError.js";

/**
 * The immutable wallet ledger (`wallet_transactions`, Phase 17). Append-only:
 * every credit/debit against a wallet balance appends exactly one row. Never
 * updated or deleted — the financial source of truth. Phase 8.
 *
 * `availableAfter` / `onHoldAfter` snapshot the affected wallet's balances
 * immediately after this entry, for auditability. `reference` links the entry
 * to its cause (e.g. the Deposit that funded a credit) and doubles as the
 * idempotency key (`reference.resourceId` + `type`).
 */
const walletTxTypes = [
  "deposit",
  "trading_yield",
  "direct_bonus",
  "team_bonus",
  "community_bonus",
  "rank_reward",
  "bonanza",
  "withdrawal_hold",
  "withdrawal_release",
  "withdrawal_paid",
  "withdrawal_reject",
  "adjustment",
] as const;

const walletTransactionSchema = new Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    wallet: { type: String, enum: ["main", "bonus", "trading"], required: true, index: true },
    type: { type: String, enum: walletTxTypes, required: true, index: true },
    direction: { type: String, enum: ["credit", "debit"], required: true },
    /** Which balance field this entry moved. */
    field: { type: String, enum: ["available", "onHold"], required: true },
    amount: { type: Number, required: true, min: 0 },
    availableAfter: { type: Number, required: true },
    onHoldAfter: { type: Number, required: true },
    reference: {
      resource: { type: String, default: null },
      resourceId: { type: String, default: null },
    },
    memo: { type: String, default: null, trim: true },
    meta: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

walletTransactionSchema.index({ user: 1, createdAt: -1 });
walletTransactionSchema.index({ user: 1, wallet: 1, createdAt: -1 });
/** Idempotency lookup: at most one entry per (user, type, reference.resourceId). */
walletTransactionSchema.index({ "reference.resourceId": 1, type: 1 });

/**
 * Append-only enforcement (Phase 15). The ledger is the financial source of
 * truth — rows must never be edited or deleted. No service mutates them (all
 * writes use `create`); these hooks block any future update/delete at the model
 * level so a mistake fails loudly instead of silently corrupting history.
 * Reads (`find`/`findOne`/`aggregate`) are unaffected.
 */
function blockMutation(): never {
  throw ApiError.badRequest("Wallet ledger entries are immutable and cannot be modified or deleted");
}
walletTransactionSchema.pre("findOneAndUpdate", blockMutation);
walletTransactionSchema.pre("findOneAndDelete", blockMutation);
walletTransactionSchema.pre("updateOne", blockMutation);
walletTransactionSchema.pre("updateMany", blockMutation);
walletTransactionSchema.pre("replaceOne", blockMutation);
walletTransactionSchema.pre("deleteOne", blockMutation);
walletTransactionSchema.pre("deleteMany", blockMutation);

export type WalletTransactionDocument = InferSchemaType<typeof walletTransactionSchema> & mongoose.Document;
export const WalletTransaction = mongoose.model<WalletTransactionDocument, Model<WalletTransactionDocument>>(
  "WalletTransaction",
  walletTransactionSchema,
);