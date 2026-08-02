import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

/**
 * A withdrawal request — Phase 8A. USDT-BEP20 only, manual admin approval.
 *
 * On submit the requested amount is moved `available → onHold` on the chosen
 * wallet (an immutable `withdrawal_hold` ledger entry). Admin review/approve are
 * status-only; reject/cancel move `onHold → available` (`withdrawal_release`);
 * mark paid permanently deducts `onHold` (`withdrawal_paid`). The wallet ledger
 * rows are the immutable financial record; this collection is the request state.
 *
 * `address` is a snapshot of the user's USDT-BEP20 payout address at submit time,
 * so the payout target is frozen even if the user later edits their profile.
 */
const withdrawalSchema = new Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    wallet: { type: String, enum: ["main", "bonus", "trading"], required: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, enum: ["USDT-BEP20"], required: true, default: "USDT-BEP20" },
    address: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["pending", "under_review", "approved", "rejected", "paid", "cancelled"],
      default: "pending",
      index: true,
    },
    remarks: { type: String, default: null, trim: true },
    processedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    processedAt: { type: Date, default: null },
    meta: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

withdrawalSchema.index({ user: 1, createdAt: -1 });
withdrawalSchema.index({ status: 1, createdAt: -1 });

export type WithdrawalDocument = InferSchemaType<typeof withdrawalSchema> & mongoose.Document;
export const Withdrawal = mongoose.model<WithdrawalDocument, Model<WithdrawalDocument>>(
  "Withdrawal",
  withdrawalSchema,
);