import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

/**
 * P2P wallet-to-wallet transfer record.
 * A debit on the sender's wallet and a credit on the receiver's wallet,
 * linked by a single transfer document.
 */
const p2pTransferSchema = new Schema(
  {
    fromUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    fromUserName: { type: String, required: true, trim: true },
    toUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    toUserName: { type: String, required: true, trim: true },
    wallet: { type: String, enum: ["main", "bonus", "trading"], required: true },
    amount: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ["completed", "failed"], default: "completed", index: true },
    memo: { type: String, default: null, trim: true, maxlength: 200 },
    meta: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

p2pTransferSchema.index({ fromUser: 1, createdAt: -1 });
p2pTransferSchema.index({ toUser: 1, createdAt: -1 });

export type P2PTransferDocument = InferSchemaType<typeof p2pTransferSchema> & mongoose.Document;
export const P2PTransfer = mongoose.model<P2PTransferDocument, Model<P2PTransferDocument>>(
  "P2PTransfer",
  p2pTransferSchema,
);