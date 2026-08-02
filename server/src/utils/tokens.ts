import { randomBytes } from "node:crypto";
import { customAlphabet } from "nanoid";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars
const makeCode = customAlphabet(ALPHABET, 8);

/** Short human-readable referral code, e.g. `ZAMINEX-AB3K9QXR`. */
export function generateReferralCode(prefix = "ZAM"): string {
  return `${prefix}${makeCode()}`;
}

/** Cryptographically random opaque token (e.g. password reset / refresh). */
export function generateOpaqueToken(bytes = 32): string {
  return randomBytes(bytes).toString("hex");
}