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

    passwordHash: { type: String, required: true, select: false },

    role: { type: String, enum: ["user", "admin"], default: "user", index: true },

    referralCode: { type: String, unique: true, required: true, index: true },
    referredBy: { type: String, default: null, index: true },

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

    status: { type: String, enum: ["active", "suspended", "banned"], default: "active", index: true },

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
    _plainPassword?: string;
    password?: string;
    verifyPassword(candidate: string): boolean;
    verifyToken(stored: string | null | undefined, candidate: string): boolean;
  };

export type UserModel = Model<UserDocument> & {
  hashToken(token: string): string;
};

export const User = mongoose.model<UserDocument, UserModel>("User", userSchema);