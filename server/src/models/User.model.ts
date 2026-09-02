import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import bcrypt from "bcryptjs";
import { generateReferralCode } from "../utils/tokens.js";

const SALT_ROUNDS = 12;

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    phone: { type: String, trim: true, maxlength: 20 },
    // Dialling prefix (e.g. "+1", "+91") chosen at registration. Optional so
    // seeds/admin-created users don't need to supply it.
    countryCode: { type: String, trim: true, default: "" },

    passwordHash: { type: String, required: true, select: false },

    // Hashed 4-digit transaction PIN — gates withdrawals / transfers. Optional
    // on the model so legacy/seeded users aren't forced to set one, but the
    // public register endpoint requires it.
    transactionPasswordHash: { type: String, default: null, select: false },

    role: { type: String, enum: ["user", "admin"], default: "user", index: true },

    referralCode: { type: String, unique: true, required: true, index: true },
    referredBy: { type: String, default: null, index: true },

    // Phase 9 referral graph: sponsor _id + ancestor chain (root → sponsor).
    // `referredBy` (above) stores the referrer's *code* for display; `sponsorId`
    // and `lineage` enable indexed descendant queries. Null/empty for roots.
    sponsorId: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    lineage: { type: [Schema.Types.ObjectId], default: [], index: true },

    isEmailVerified: { type: Boolean, default: false },

    // Hashed refresh token currently issued to this user (null after logout).
    refreshTokenHash: { type: String, default: null, select: false },

    // Hashed reset password token (with expiry) — wired in Phase 3.
    resetTokenHash: { type: String, default: null, select: false },
    resetTokenExpires: { type: Date, default: null },

    // Hashed email-verification token (with expiry) — Phase 3.
    emailVerifyTokenHash: { type: String, default: null, select: false },
    emailVerifyTokenExpires: { type: Date, default: null },

    themePreference: { type: String, enum: ["light", "dark"], default: "light" },
    notificationPreference: {
      email: { type: Boolean, default: true },
      dashboard: { type: Boolean, default: true },
    },

    // User's own crypto payout/deposit addresses (USDT-BEP20 only). Distinct
    // from the Phase 8 wallet balance system.
    walletAddresses: {
      usdtBep20: { type: String, trim: true, default: "" },
    },

    // New members start inactive until they activate a package (the seeded
    // admin and admin-created users set "active" explicitly). Existing rows
    // keep their stored value — only new documents inherit this default.
    status: { type: String, enum: ["active", "inactive", "blocked"], default: "inactive", index: true },

    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true },
);

/** Plain-text password setter — never store raw strings. */
userSchema.virtual("password").set(function (this: UserDocument, value: string) {
  this._plainPassword = value;
  this.passwordHash = bcrypt.hashSync(value, SALT_ROUNDS);
});

userSchema.virtual("password").get(function (this: UserDocument) {
  return this._plainPassword as string | undefined;
});

/** Compare a candidate password against the stored hash. */
userSchema.methods.verifyPassword = function (candidate: string): boolean {
  return bcrypt.compareSync(candidate, this.passwordHash);
};

/** Plain-text 4-digit transaction PIN setter — hash on assignment, never store raw. */
userSchema.virtual("transactionPassword").set(function (this: UserDocument, value: string) {
  this._plainTransactionPassword = value;
  this.transactionPasswordHash = value ? bcrypt.hashSync(value, SALT_ROUNDS) : null;
});

userSchema.virtual("transactionPassword").get(function (this: UserDocument) {
  return this._plainTransactionPassword as string | undefined;
});

/** Compare a candidate 4-digit PIN against the stored transaction PIN hash. */
userSchema.methods.verifyTransactionPassword = function (candidate: string): boolean {
  if (!this.transactionPasswordHash) return false;
  return bcrypt.compareSync(candidate, this.transactionPasswordHash);
};

/** Hash an arbitrary token (refresh/reset) before storing it. */
userSchema.statics.hashToken = function (token: string): string {
  return bcrypt.hashSync(token, SALT_ROUNDS);
};

userSchema.methods.verifyToken = function (stored: string | null | undefined, candidate: string): boolean {
  if (!stored) return false;
  return bcrypt.compareSync(candidate, stored);
};

/** Ensure a unique referral code on new documents. */
userSchema.pre("validate", function (this: UserDocument, next) {
  if (!this.referralCode) this.referralCode = generateReferralCode();
  next();
});

export type UserDocument = InferSchemaType<typeof userSchema> &
  mongoose.Document & {
    passwordHash: string;
    transactionPasswordHash?: string | null;
    _plainPassword?: string;
    _plainTransactionPassword?: string;
    password?: string;
    transactionPassword?: string;
    walletAddresses: { usdtBep20?: string };
    verifyPassword(candidate: string): boolean;
    verifyTransactionPassword(candidate: string): boolean;
    verifyToken(stored: string | null | undefined, candidate: string): boolean;
  };

export type UserModel = Model<UserDocument> & {
  hashToken(token: string): string;
};

export const User = mongoose.model<UserDocument, UserModel>("User", userSchema);