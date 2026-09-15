import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

/**
 * Read-model cache: per-contributor breakdown for `team_bonus` ledger credits
 * that predate `meta.sources` (added after the Daily Team Energy engine
 * shipped). Populated once by `scripts/backfill-team-energy-sources.ts`,
 * which reconstructs each day's per-ancestor contributor split from lineage
 * + package history. Never touches the ledger itself — `WalletTransaction`
 * stays immutable and remains the sole financial source of truth; this
 * collection exists purely so historical reports can still show "from whom,
 * at what level" for rows credited before that field existed.
 */
const teamEnergySourceCacheSchema = new Schema(
  {
    ledgerEntryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WalletTransaction",
      required: true,
      unique: true,
      index: true,
    },
    sources: [
      {
        _id: false,
        fromUserId: { type: String, required: true },
        fromUserName: { type: String, default: null },
        fromReferralCode: { type: String, default: null },
        level: { type: Number, required: true },
        amount: { type: Number, required: true },
      },
    ],
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export type TeamEnergySourceCacheDocument = InferSchemaType<typeof teamEnergySourceCacheSchema> & mongoose.Document;
export const TeamEnergySourceCache = mongoose.model<TeamEnergySourceCacheDocument, Model<TeamEnergySourceCacheDocument>>(
  "TeamEnergySourceCache",
  teamEnergySourceCacheSchema,
);
