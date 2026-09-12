/**
 * One-off diagnostic: impact of the direct-count star rule on existing data.
 * 1) users where raw directCount differs from activeDirectCount (reports show raw),
 * 2) rank_reward ledger entries where the star paid no longer matches the
 *    user's active-direct count under the new ladder.
 */
import "dotenv/config";
import mongoose from "mongoose";
import { User, Rank, UserPackage, WalletTransaction } from "../models/index.js";
import { getTeamCounts } from "../services/referral.service.js";

async function main() {
  await mongoose.connect(process.env.MONGO_URI!);

  const ladder = await Rank.find({ status: "active", order: { $gte: 1 } }).sort({ order: 1 }).lean();

  const users = await User.find({ role: { $ne: "admin" } }).select("name email status highestStar").lean();
  console.log(`users: ${users.length}`);

  // 1. raw vs active directs
  let rawVsActiveDiff = 0;
  let starMismatches = 0;
  for (const u of users) {
    const c = await getTeamCounts(String(u._id));
    if (c.directCount !== c.activeDirectCount) {
      rawVsActiveDiff++;
      console.log(
        `RAW≠ACTIVE ${u.email}: directs=${c.directCount} active=${c.activeDirectCount} highestStar=${(u as { highestStar?: number }).highestStar ?? 0}`,
      );
    }
    // star under the new rule (active directs) vs stored highestStar
    let top = 0;
    for (const r of ladder) {
      if (c.activeDirectCount >= (r.requiredDirects as number)) top = r.order as number;
      else break;
    }
    const stored = (u as { highestStar?: number }).highestStar ?? 0;
    if (stored !== top) {
      starMismatches++;
      console.log(`STAR MISMATCH ${u.email}: stored=${stored} newRule=${top} (activeDirects=${c.activeDirectCount})`);
    }
  }
  console.log(`--- raw≠active: ${rawVsActiveDiff}, stored≠newRule: ${starMismatches}`);

  // 2. rank rewards paid that the new rule wouldn't pay (star above active-direct qualification)
  const rewards = await WalletTransaction.find({ type: "rank_reward", direction: "credit" }).lean();
  console.log(`rank_reward credits total: ${rewards.length}`);
  const uidSet = new Set(rewards.map((r) => (r.user as { toString(): string }).toString()));
  const pkgByUser = new Map<string, boolean>(
    (await UserPackage.find({ user: { $in: [...uidSet] }, status: "active" }).select("user")).map((p) => [
      (p.user as { toString(): string }).toString(),
      true,
    ]),
  );
  for (const r of rewards) {
    const uid = (r.user as { toString(): string }).toString();
    const star = Number((r.meta as { star?: number; name?: string } | undefined)?.star ?? NaN);
    const name = (r.meta as { name?: string } | undefined)?.name ?? "";
    if (!Number.isFinite(star) || star < 1) continue;
    const rank = ladder.find((x) => x.name === name);
    const needDirects = rank ? (rank.requiredDirects as number) : null;
    const c = uidSet.has(uid) ? await getTeamCounts(uid) : null;
    const qualifies = needDirects !== null && c ? c.activeDirectCount >= needDirects : "unknown";
    if (qualifies !== true) {
      const u = await User.findById(uid).select("email status").lean();
      console.log(
        `PAID-BUT-NOT-QUALIFIED: ${u?.email} star=${star} needsDirects=${needDirects} activeDirects=${c?.activeDirectCount} status=${u?.status} amount=${r.amount} activePkg=${Boolean(pkgByUser.get(uid))} tx=${r._id}`,
      );
    }
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});