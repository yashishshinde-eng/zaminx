import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

/**
 * A site-wide announcement (Phase 17, Master). Admin-curated, optionally
 * date-windowed banners surfaced on the public site. Only `active` rows whose
 * `startsAt`/`endsAt` window covers `now` are publicly listed (the read path
 * belongs to the CMS surface — this model establishes the collection).
 */
const announcementSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    /** Optional CTA link rendered with the announcement. */
    link: { type: String, trim: true, default: null },
    type: { type: String, enum: ["info", "success", "warning", "promotion"], default: "info" },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    /** Inclusive window; `null` endsAt means open-ended. */
    startsAt: { type: Date, default: () => new Date() },
    endsAt: { type: Date, default: null },
  },
  { timestamps: true },
);

announcementSchema.index({ status: 1, startsAt: 1 });

export type AnnouncementDocument = InferSchemaType<typeof announcementSchema> & mongoose.Document;
export const Announcement = mongoose.model<AnnouncementDocument, Model<AnnouncementDocument>>(
  "Announcement",
  announcementSchema,
);