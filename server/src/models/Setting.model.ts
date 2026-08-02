import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

/**
 * Generic key/value store for platform configuration (CMS, SMTP, NOWPayments,
 * compensation defaults, bonanza). Seeded empty in Phase 1; populated by later
 * phases via the admin panel.
 */
const settingSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, trim: true, index: true },
    value: { type: Schema.Types.Mixed, default: null },
    category: {
      type: String,
      enum: ["cms", "smtp", "payment", "compensation", "bonanza", "general", "security"],
      default: "general",
      index: true,
    },
    isPublic: { type: Boolean, default: false }, // exposed to the public website
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

export type SettingDocument = InferSchemaType<typeof settingSchema> & mongoose.Document;
export const Setting = mongoose.model<SettingDocument, Model<SettingDocument>>("Setting", settingSchema);