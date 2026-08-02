import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

/** Audit log — every security-sensitive action appends one row. */
const activityLogSchema = new Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    action: { type: String, required: true, trim: true, index: true },
    resource: { type: String, trim: true },
    resourceId: { type: String, trim: true },
    meta: { type: Schema.Types.Mixed, default: {} },
    ip: { type: String, trim: true },
    userAgent: { type: String, trim: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

activityLogSchema.index({ createdAt: -1 });

export type ActivityLogDocument = InferSchemaType<typeof activityLogSchema> & mongoose.Document;
export const ActivityLog = mongoose.model<ActivityLogDocument, Model<ActivityLogDocument>>(
  "ActivityLog",
  activityLogSchema,
);