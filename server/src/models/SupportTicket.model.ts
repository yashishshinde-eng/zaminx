import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

/**
 * A support ticket raised by a user, with an embedded conversation thread.
 *
 * Lifecycle: `open ⇄ answered → closed`.
 *   - user reply on `answered`/`closed` → reopen to `open`
 *   - admin reply → `answered` (+ `assignedTo` set to the admin)
 *   - explicit close → `closed` (replies can still reopen)
 *
 * `replies[0]` is the user's opening message (pushed at creation). Each reply
 * subdocument gets its own `_id` so the API can expose a stable `id`.
 */
const replySchema = new Schema(
  {
    sender: { type: String, enum: ["user", "admin"], required: true },
    message: { type: String, required: true, trim: true, maxlength: 5000 },
  },
  { _id: true, timestamps: { createdAt: true, updatedAt: false } },
);

const supportTicketSchema = new Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    category: {
      type: String,
      enum: ["account", "payments", "withdrawals", "package", "technical", "other"],
      required: true,
      index: true,
    },
    subject: { type: String, required: true, trim: true, minlength: 3, maxlength: 160 },
    status: {
      type: String,
      enum: ["open", "answered", "closed"],
      default: "open",
      index: true,
    },
    replies: { type: [replySchema], default: [] },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    meta: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

// User-facing list (newest first) + admin inbox by status.
supportTicketSchema.index({ user: 1, createdAt: -1 });
supportTicketSchema.index({ status: 1, createdAt: -1 });

export type SupportTicketDocument = InferSchemaType<typeof supportTicketSchema> & mongoose.Document;
export const SupportTicket = mongoose.model<SupportTicketDocument, Model<SupportTicketDocument>>(
  "SupportTicket",
  supportTicketSchema,
);