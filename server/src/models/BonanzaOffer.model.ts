import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

/**
 * A Bonanza offer — a dynamic, time-limited reward (Phase 10). Admin-configured;
 * the engine awards a user `rewardAmount` to their bonus wallet once their
 * direct-referral count reaches `requiredDirects` within the offer window.
 *
 * The award itself is recorded as a `bonanza` ledger row keyed by
 * `bonanza:<offerId>:<userId>` (idempotent) — no separate award collection.
 */
const bonanzaOfferSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    requiredDirects: { type: Number, required: true, min: 1 },
    rewardAmount: { type: Number, required: true, min: 0 },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: { type: String, enum: ["active", "inactive"], default: "active", index: true },
    terms: { type: String, trim: true, maxlength: 1000, default: null },
    meta: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

bonanzaOfferSchema.index({ status: 1, startDate: 1 });

export type BonanzaOfferDocument = InferSchemaType<typeof bonanzaOfferSchema> & mongoose.Document;
export const BonanzaOffer = mongoose.model<BonanzaOfferDocument, Model<BonanzaOfferDocument>>(
  "BonanzaOffer",
  bonanzaOfferSchema,
);