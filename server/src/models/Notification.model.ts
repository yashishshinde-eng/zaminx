import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

/**
 * In-app notification inbox row (Phase 17, Transactions). One per user-facing
 * event (deposit confirmed, withdrawal update, rank achieved, bonanza earned,
 * …). Phase 12 (deferred to the end) populates and surfaces these; this model
 * establishes the collection and the read indexes the inbox will need.
 */
const notificationSchema = new Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: {
      type: String,
      required: true,
      enum: ["deposit", "withdrawal", "rank", "bonanza", "team", "community", "system"],
    },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    message: { type: String, required: true, trim: true, maxlength: 1000 },
    read: { type: Boolean, default: false, index: true },
    /** Optional deep link into the app. */
    link: { type: String, trim: true, default: null },
    meta: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

notificationSchema.index({ user: 1, read: 1, createdAt: -1 });
notificationSchema.index({ user: 1, createdAt: -1 });

export type NotificationDocument = InferSchemaType<typeof notificationSchema> & mongoose.Document;
export const Notification = mongoose.model<NotificationDocument, Model<NotificationDocument>>(
  "Notification",
  notificationSchema,
);