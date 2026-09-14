/**
 * One-off correction: 3 rank_reward credits were awarded under the old
 * direct-count-only rank rule, before it was unified onto the shared 3^N
 * Star Qualification Engine (2026-09-14). Those users don't qualify for the
 * awarded rung under the new rule. Per the WalletTransaction model's
 * append-only design ("financial source of truth... Never updated or
 * deleted"), we don't delete the original credits — we post reversing
 * "adjustment" debits so the ledger keeps a full audit trail and the wallet
 * balances end up correct.
 *
 * Usage: npx tsx src/scripts/reverse-improper-rank-rewards.ts
 *
 * Already run once (2026-09-14) — safe to re-run, idempotent via
 * `reference.resourceId` in applyLedgerEntry.
 */
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import { logger } from "../config/logger.js";
import { applyLedgerEntry } from "../services/wallet.service.js";
import { User } from "../models/index.js";

const REVERSALS = [
  { txId: "6aa8179687468543111cef92", userId: "6aa81007ecb536623ec680b1", amount: 20, rankName: "2 Star" },
  { txId: "6aa817af87468543111cf00f", userId: "6aa81007ecb536623ec680b1", amount: 50, rankName: "3 Star" },
  { txId: "6aa8185a87468543111cf10d", userId: "", amount: 10, rankName: "1 Star" }, // resolved below by email
];

async function main() {
  await connectDB();

  // Resolve the tree-test user's id by email rather than a hardcoded guess.
  const treeUser = await User.findOne({ email: "zam-l1-1@tree-test.zeminex.dev" }).select("_id").lean();
  if (!treeUser) throw new Error("zam-l1-1 tree user not found");
  REVERSALS[2].userId = treeUser._id.toString();

  for (const r of REVERSALS) {
    const result = await applyLedgerEntry({
      userId: r.userId,
      wallet: "bonus",
      field: "available",
      direction: "debit",
      amount: r.amount,
      type: "adjustment",
      reference: { resource: "WalletTransaction", resourceId: `rank_reward_reversal:${r.txId}` },
      memo: `Reversal — improper "${r.rankName}" rank reward awarded under the old direct-count rule (rule unified to the 3^N per-level Star Qualification Engine on 2026-09-14)`,
      meta: { originalTxId: r.txId, rankName: r.rankName, reason: "rank-rule-unification-2026-09-14" },
    });
    logger.info(`Reversed ${r.rankName} ($${r.amount}) for user ${r.userId} — new bonus balance: $${result.balance.available}`);
  }

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  logger.error("Reversal failed", { error: err instanceof Error ? err.message : String(err) });
  process.exit(1);
});
