import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

/** Contact-form submissions. Email delivery is Phase 13; stored until then. */
const contactMessageSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, trim: true, lowercase: true },
    subject: { type: String, trim: true, maxlength: 160 },
    message: { type: String, required: true, maxlength: 5000 },
    ip: { type: String, trim: true },
    userAgent: { type: String, trim: true },
    handled: { type: Boolean, default: false, index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export type ContactMessageDocument = InferSchemaType<typeof contactMessageSchema> & mongoose.Document;
export const ContactMessage = mongoose.model<ContactMessageDocument, Model<ContactMessageDocument>>(
  "ContactMessage",
  contactMessageSchema,
);