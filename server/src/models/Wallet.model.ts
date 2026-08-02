import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

/**
 * A user's wallet — one document per user — materialising the balances of the
 * three wallets (Main / Bonus / Trading), each with an `available` and `onHold`
 * figure. This is the fast read path; the immutable `wallet_transactions` ledger
 * is the source of truth and balances are reconciled from it by `applyLedgerEntry`
 * (atomic `$inc` + ledger append). Phase 8.
 */
const walletSchema = new Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    balances: {
      main: {
        available: { type: Number, default: 0 },
        onHold: { type: Number, default: 0 },
      },
      bonus: {
        available: { type: Number, default: 0 },
        onHold: { type: Number, default: 0 },
      },
      trading: {
        available: { type: Number, default: 0 },
        onHold: { type: Number, default: 0 },
      },
    },
  },
  { timestamps: true },
);

export type WalletDocument = InferSchemaType<typeof walletSchema> & mongoose.Document;
export const Wallet = mongoose.model<WalletDocument, Model<WalletDocument>>("Wallet", walletSchema);