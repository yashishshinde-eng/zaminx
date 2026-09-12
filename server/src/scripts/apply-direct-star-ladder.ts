/**
 * One-off migration: switch the star ladder to DIRECT-count qualification.
 * 1 Star = 1 active direct, 2 Star = 2 active directs, … (team size no longer
 * gates stars). Updates every star rung in the live DB, then recomputes each
 * user's `highestStar` from the new ladder — this CAN LOWER values that were
 * ratcheted up under the old team-size rule.
 */
import "dotenv/config";
import mongoose from "mongoose";
import { User, Rank } from "../models/index.js";
import { getTeamCounts } from "../services/referral.service.js";

async function main() {
  await mongoose.connect(process.env.MONGO_URI!);
  console.log("connected");

  // 1. Point the ladder at direct counts only.
  const ladder = await Rank.find({ status: "active", order: { $gte: 1 } }).sort({ order: 1 });
  for (const r of ladder) {
    const before = `directs=${r.requiredDirects} team=${r.requiredTeamSize}`;
    r.requiredDirects = r.order;
    r.requiredTeamSize = 0;
    r.description = `${r.order} Star — ${r.order} active direct${r.order > 1 ? "s" : ""}.`;
    await r.save();
    console.log(`rank ${r.name} (order ${r.order}): ${before} -> directs=${r.order} team=0`);
  }

  // 2. Recompute highestStar for every user from the new ladder.
  const users = await User.find({}).select("highestStar").lean();
  let changed = 0;
  for (const u of users) {
    const { activeDirectCount } = await getTeamCounts(String(u._id));
    let topOrder = 0;
    for (const r of ladder) {
      if (activeDirectCount >= (r.requiredDirects as number)) topOrder = r.order as number;
      else break;
    }
    const current = (u as { highestStar?: number }).highestStar ?? 0;
    if (current !== topOrder) {
      await User.updateOne({ _id: u._id }, { $set: { highestStar: topOrder } });
      console.log(`highestStar ${u.email}: ${current} -> ${topOrder} (activeDirects=${activeDirectCount})`);
      changed++;
    }
  }
  console.log(`done — ${users.length} users scanned, ${changed} adjusted`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});