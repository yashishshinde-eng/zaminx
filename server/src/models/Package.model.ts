import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

/**
 * An admin-defined investment tier (catalog entry). Seeded with default tiers
 * in Phase 6; admin CRUD lands in Phase 14. A `UserPackage` (subscription)
 * snapshots these terms at activation so historical records stay immutable
 * even if the tier is later edited.
 */
const packageSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true, index: true },
    description: { type: String, trim: true, maxlength: 500 },
    priceUsd: { type: Number, required: true, min: 1 },
    /** Daily trading yield, e.g. 1.5 = 1.5%. */
    dailyReturnPct: { type: Number, required: true, min: 0, max: 5 },
    /** Term length in days. */
    durationDays: { type: Number, required: true, min: 1 },
    features: [{ type: String, trim: true, maxlength: 120 }],
    sort: { type: Number, default: 0 },
    status: { type: String, enum: ["active", "inactive"], default: "active", index: true },
  },
  { timestamps: true },
);

export type PackageDocument = InferSchemaType<typeof packageSchema> & mongoose.Document;
export const Package = mongoose.model<PackageDocument, Model<PackageDocument>>("Package", packageSchema);