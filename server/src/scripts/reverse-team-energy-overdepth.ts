/**
 * One-off reversal: every historical `team_bonus` credit paid at a level deeper
 * than the receiver's (sticky) star is debited back from their Bonus wallet.
 *
 * - Idempotent: each debit is keyed `team-energy-cap-reversal:<originalTxId>`,
 *   so re-running never double-deducts.
 * - Balance-guarded: if the Bonus wallet no longer holds the full owed amount
 *   (spent/withdrawn), only the available part is deducted and the remainder is
 *   reported as uncollectible — balances never go negative.
 */
import "dotenv/config";
import mongoose from "mongoose";
import { User, Wallet, WalletTransaction } from "../models/index.js";
import { applyLedgerEntry } from "../services/wallet.service.js";

async function main() {
  await mongoose.connect(process.env.MONGO_URI!);
  console.log("connected");

  const credits = (await WalletTransaction.find({
    type: "team_bonus",
    direction: "credit",
    "meta.level": { $gt: 0 },
  }).lean()) as unknown as {
    _id: { toString(): string };
    user: { toString(): string };
    amount: number;
    meta?: { level?: number } | null;
  }[];

  // Current (sticky) star per receiver — the most generous cap: credits within
  // the star the user EVER achieved stay.
  const receiverIds = Array.from(new Set(credits.map((c) => c.user.toString())));

  const users = await User.find({ _id: { $in: receiverIds } }).select("highestStar").lean();
  const starByUser = new Map(users.map((u) => [u._id.toString(), (u as { highestStar?: number }).highestStar ?? 0]));

  const wallets = await Wallet.find({ user: { $in: receiverIds } }).lean();
  const availByUser = new Map<string, number>(
    wallets.map((w) => [
      (w.user as { toString(): string }).toString(),
      ((w.balances as { bonus?: { available?: number } }).bonus?.available ?? 0),
    ]),
  );

  const overDepth = credits.filter((c) => {
    const level = c.meta?.level;
    if (!level) return false;
    return level > (starByUser.get(c.user.toString()) ?? 0);
  });
  console.log(`over-depth credits: ${overDepth.length} across ${new Set(overDepth.map((c) => c.user.toString())).size} users`);

  let deducted = 0;
  let uncollectible = 0;
  for (const c of overDepth) {
    const uid = c.user.toString();
    const avail = availByUser.get(uid) ?? 0;
    const deduct = Math.min(c.amount, avail);
    const rounded = Math.round(deduct * 100) / 100;
    if (rounded > 0) {
      try {
        await applyLedgerEntry({
          userId: uid,
          wallet: "bonus",
          field: "available",
          direction: "debit",
          amount: rounded,
          type: "team_bonus",
          reference: { resource: "WalletTransaction", resourceId: `team-energy-cap-reversal:${c._id.toString()}` },
          memo: `Team energy reversal — level ${c.meta?.level} income beyond ${starByUser.get(uid) ?? 0} Star`,
          meta: { reversalOf: "team-energy-depth-cap", originalTxId: c._id.toString(), level: c.meta?.level ?? null },
        });
        deducted += rounded;
        // Track the wallet drain so successive credits for the same user don't
        // over-deduct against a stale `avail`.
        availByUser.set(uid, avail - rounded);
      } catch (err) {
        console.error(`deduct failed ${uid}:`, err instanceof Error ? err.message : err);
      }
    }
    const shortfall = Math.round((c.amount - rounded) * 100) / 100;
    if (shortfall > 0.001) {
      uncollectible += shortfall;
      console.log(`PARTIAL ${uid}: owed ${c.amount.toFixed(2)}, available ${avail.toFixed(2)}, uncollectible ${shortfall.toFixed(2)}`);
    }
  }

  console.log(`done — deducted $${deducted.toFixed(2)}, uncollectible $${uncollectible.toFixed(2)}`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});