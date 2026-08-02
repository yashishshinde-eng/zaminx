import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

/**
 * Payment-gateway interaction log (Phase 17, Transactions). One row per
 * NOWPayments IPN event (and future gateway interactions): records the event
 * type, the resolved deposit/user, the raw gateway status, whether the
 * signature was valid, and a redacted `meta`. Written fire-and-forget from the
 * webhook so logging never blocks the always-200 response. Append-only.
 */
const paymentLogSchema = new Schema(
  {
    event: {
      type: String,
      required: true,
      enum: ["webhook_received", "deposit_confirmed", "invoice_created", "invoice_failed", "simulate"],
    },
    /** Resolved deposit (null when the webhook names an unknown order). */
    deposit: { type: mongoose.Schema.Types.ObjectId, ref: "Deposit", default: null, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    /** NOWPayments payment_id. */
    paymentId: { type: String, trim: true, default: null },
    /** Our deposit id / NOWPayments invoice id as carried in `order_id`/`id`. */
    invoiceId: { type: String, trim: true, default: null },
    /** Raw gateway status string (e.g. "finished", "waiting", "confirmed"). */
    status: { type: String, trim: true, default: null },
    /** Whether the webhook signature verified. */
    received: { type: Boolean, default: true },
    meta: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

paymentLogSchema.index({ deposit: 1, createdAt: -1 });
paymentLogSchema.index({ user: 1, createdAt: -1 });

export type PaymentLogDocument = InferSchemaType<typeof paymentLogSchema> & mongoose.Document;
export const PaymentLog = mongoose.model<PaymentLogDocument, Model<PaymentLogDocument>>(
  "PaymentLog",
  paymentLogSchema,
);