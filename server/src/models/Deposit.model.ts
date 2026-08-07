import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

/**
 * A deposit record — created when a user activates a package (Phase 7).
 * One deposit per activation. Flips pending → paid on NOWPayments webhook
 * confirmation (or the dev sandbox simulate endpoint), which also activates
 * the associated UserPackage.
 */
const depositSchema = new Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    // Null for admin-recorded standalone deposits (no package activation).
    userPackage: { type: mongoose.Schema.Types.ObjectId, ref: "UserPackage", required: false, index: true, default: null },
    package: { type: mongoose.Schema.Types.ObjectId, ref: "Package", required: false, default: null },
    amountUsd: { type: Number, required: true, min: 0 },
    currency: { type: String, enum: ["USDT-BEP20"], required: true, default: "USDT-BEP20" },
    status: {
      type: String,
      enum: ["pending", "paid", "expired", "failed"],
      default: "pending",
      index: true,
    },
    /** NOWPayments invoice id (or `sandbox-<id>` when mocked). */
    nowpaymentsInvoiceId: { type: String, default: null, index: true },
    /** NOWPayments payment id, set on webhook confirmation. */
    nowpaymentsPaymentId: { type: String, default: null },
    /** USDT-BEP20 address the user sends funds to. */
    payAddress: { type: String, default: null, trim: true },
    /** Crypto amount due. */
    payAmount: { type: Number, default: null, min: 0 },
    /** NOWPayments hosted checkout URL (null in sandbox). */
    hostedUrl: { type: String, default: null, trim: true },
    /** True when the invoice is a local mock (no NOWPayments keys configured). */
    sandbox: { type: Boolean, default: false },
    meta: { type: Schema.Types.Mixed, default: {} },
    paidAt: { type: Date, default: null },
  },
  { timestamps: true },
);

depositSchema.index({ user: 1, createdAt: -1 });

export type DepositDocument = InferSchemaType<typeof depositSchema> & mongoose.Document;
export const Deposit = mongoose.model<DepositDocument, Model<DepositDocument>>("Deposit", depositSchema);