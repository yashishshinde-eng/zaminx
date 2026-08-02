import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

/**
 * Cron-job run audit trail (Phase 17, Transactions). One row per scheduled-job
 * execution: which job ran, success/failed/skipped, timing, rows processed, and
 * any error. Phase 18 (Cron Jobs) writes these as each job runs; this model
 * establishes the collection and the per-job history indexes.
 */
const cronLogSchema = new Schema(
  {
    job: { type: String, required: true, trim: true, index: true },
    status: { type: String, required: true, enum: ["success", "failed", "skipped"] },
    startedAt: { type: Date, required: true },
    finishedAt: { type: Date, default: null },
    durationMs: { type: Number, default: null, min: 0 },
    /** Rows affected / processed by the run. */
    processed: { type: Number, default: 0, min: 0 },
    error: { type: String, trim: true, default: null },
    meta: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

cronLogSchema.index({ job: 1, createdAt: -1 });

export type CronLogDocument = InferSchemaType<typeof cronLogSchema> & mongoose.Document;
export const CronLog = mongoose.model<CronLogDocument, Model<CronLogDocument>>(
  "CronLog",
  cronLogSchema,
);