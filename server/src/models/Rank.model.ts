import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

/**
 * A Rank ladder tier (Phase 10A). Admin-configured; the rank engine awards a
 * user `rewardAmount` to their bonus wallet once they meet both
 * `requiredDirects` and `requiredTeamSize` (the highest qualifying rank wins).
 *
 * The award itself is recorded as a `rank_reward` ledger row keyed by
 * `rank:<rankId>:<userId>` (idempotent) — no separate award collection. The
 * dashboard `account.rank` slice is computed read-only from the active ladder.
 */
const rankSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    order: { type: Number, required: true, min: 0 },
    requiredDirects: { type: Number, min: 0, default: 0 },
    requiredTeamSize: { type: Number, min: 0, default: 0 },
    rewardAmount: { type: Number, min: 0, default: 0 },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    description: { type: String, trim: true, maxlength: 500, default: null },
  },
  { timestamps: true },
);

rankSchema.index({ order: 1 });

export type RankDocument = InferSchemaType<typeof rankSchema> & mongoose.Document;
export const Rank = mongoose.model<RankDocument, Model<RankDocument>>("Rank", rankSchema);