/** One-off: why did the dev team-energy run skip star users? */
import "dotenv/config";
import mongoose from "mongoose";
import { User, WalletTransaction } from "../models/index.js";
import { batchPerLevelActiveTeamCounts, MAX_TEAM_ENERGY_STAR } from "../services/teamEnergy.service.js";

async function main() {
  const today = new Date().toISOString().slice(0, 10);
  await mongoose.connect(process.env.MONGO_URI!);
  const stars = await User.find({ teamEnergyStar: { $gte: 1 } })
    .select("name email lineage teamEnergyStar status")
    .lean();
  console.log(`users with teamEnergyStar>=1: ${stars.length}, today=${today}`);
  for (const u of stars.slice(0, 12)) {
    const legacy = await WalletTransaction.countDocuments({
      user: u._id,
      type: "team_bonus",
      "meta.date": today,
    });
    const counts = await batchPerLevelActiveTeamCounts([String(u._id)], MAX_TEAM_ENERGY_STAR);
    const lvl1 = counts.get(String(u._id))?.get(1) ?? 0;
    console.log(`${u.email} star=${u.teamEnergyStar} status=${u.status} lvl1Active=${lvl1} legacyTeamBonusToday=${legacy}`);
  }
  await mongoose.disconnect();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});