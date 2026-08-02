import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

/**
 * A user's subscription to a package — the activation/history/status record.
 *
 * Phase 6 creates rows in `pending` state (awaiting payment). Phase 7's
 * NOWPayments webhook flips `pending` → `active`, sets `activatedAt`/`expiresAt`,
 * and records the `paymentId`. The `snapshot` captures the package terms at
 * activation so the ledger stays immutable even if the tier is later edited.
 */
const userPackageSchema = new Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    package: { type: mongoose.Schema.Types.ObjectId, ref: "Package", required: true },
    snapshot: {
      name: { type: String, required: true },
      priceUsd: { type: Number, required: true },
      dailyReturnPct: { type: Number, required: true },
      durationDays: { type: Number, required: true },
    },
    status: {
      type: String,
      enum: ["pending", "active", "expired", "cancelled"],
      default: "pending",
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
    },
    /** NOWPayments invoice id — populated in Phase 7. */
    paymentId: { type: String, default: null },
    /** Set when the subscription flips to active (Phase 7 webhook). */
    activatedAt: { type: Date, default: null },
    /** Computed on activation: activatedAt + durationDays (Phase 7). */
    expiresAt: { type: Date, default: null },
  },
  { timestamps: true },
);

userPackageSchema.index({ user: 1, status: 1 });

export type UserPackageDocument = InferSchemaType<typeof userPackageSchema> & mongoose.Document;
export const UserPackage = mongoose.model<UserPackageDocument, Model<UserPackageDocument>>(
  "UserPackage",
  userPackageSchema,
);