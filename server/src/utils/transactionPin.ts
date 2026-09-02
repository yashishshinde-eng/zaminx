import bcrypt from "bcryptjs";
import { User } from "../models/index.js";
import { ApiError } from "./ApiError.js";

/**
 * Verify a 4-digit transaction PIN for a user. Loads the hashed PIN from the
 * DB (it is `select: false` by default) and bcrypt-compares it.
 *
 * - If the user has a PIN set, the candidate must match (throws 400 on mismatch).
 * - If the user has NO PIN set (legacy / pre-feature account), we refuse the
 *   gated action with a clear message directing them to set one first.
 *
 * Used to gate withdrawals and P2P transfers.
 */
export async function verifyTransactionPassword(userId: string, candidate: string): Promise<void> {
  const user = await User.findById(userId).select("+transactionPasswordHash").lean();
  if (!user) throw ApiError.unauthorized();

  if (!user.transactionPasswordHash) {
    throw ApiError.badRequest("Set your transaction PIN in Settings before performing this action.");
  }
  if (!bcrypt.compareSync(candidate, user.transactionPasswordHash)) {
    throw ApiError.badRequest("Incorrect transaction PIN");
  }
}