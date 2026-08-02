import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

/**
 * Admin-editable email copy, keyed by event (Phase 17, Master). The default
 * templates live in `services/emailTemplates.ts`; a future enhancement resolves
 * the active DB row by `key` and falls back to the TS default when absent or
 * `inactive`. This model establishes the collection and fixes the keys/schema
 * (`deposit_success`, `welcome`, `reset_password`, …) so the admin surface can
 * manage copy without touching code.
 */
const emailTemplateSchema = new Schema(
  {
    /** Stable event key, lowercase, unique — matches an email event. */
    key: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 80 },
    /** Human label shown in the admin list. */
    name: { type: String, required: true, trim: true, maxlength: 120 },
    subject: { type: String, required: true, trim: true, maxlength: 200 },
    html: { type: String, required: true },
    text: { type: String, required: true },
    description: { type: String, trim: true, maxlength: 500, default: null },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
  },
  { timestamps: true },
);

export type EmailTemplateDocument = InferSchemaType<typeof emailTemplateSchema> & mongoose.Document;
export const EmailTemplate = mongoose.model<EmailTemplateDocument, Model<EmailTemplateDocument>>(
  "EmailTemplate",
  emailTemplateSchema,
);