/**
 * One-off diagnostic: team_bonus credits paid at a level deeper than the
 * receiver's star (no longer allowed under the per-star depth cap).
 */
import "dotenv/config";
import mongoose from "mongoose";
import { User, WalletTransaction } from "../models/index.js";

async function main() {
  await mongoose.connect(process.env.MONGO_URI!);

  const rows = await WalletTransaction.aggregate<{ _id: string; maxLevel: number; count: number }>([
    { $match: { type: "team_bonus", direction: "credit" } },
    {
      $group: {
        _id: { $toString: "$user" },
        maxLevel: { $max: "$meta.level" },
        count: { $sum: 1 },
      },
    },
  ]);

  const users = await User.find({ _id: { $in: rows.map((r) => r._id) } })
    .select("email highestStar")
    .lean();
  const starByUser = new Map(users.map((u) => [u._id.toString(), (u as { highestStar?: number }).highestStar ?? 0]));

  let over = 0;
  for (const r of rows) {
    const star = starByUser.get(r._id) ?? 0;
    if (r.maxLevel > star) {
      over++;
      console.log(`PAID PAST CAP: user=${r._id} star=${star} maxLevelPaid=${r.maxLevel} credits=${r.count}`);
    }
  }
  console.log(`team_bonus receivers: ${rows.length}, receiving deeper than their star: ${over}`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});