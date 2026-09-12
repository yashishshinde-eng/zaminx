/**
 * One-off backfill: recompute `User.teamEnergyStar` for every user from the
 * authoritative per-level ACTIVE member counts (teamEnergy.service.ts).
 * Run once after deploying the star-qualified Daily Team Energy model; safe to
 * re-run (pure $set of the computed value).
 *
 * Usage: npx tsx src/scripts/recalc-team-energy-star.ts
 */
import "dotenv/config";
import mongoose from "mongoose";
import { User } from "../models/index.js";
import { computeEnergyStar, MAX_TEAM_ENERGY_STAR, perLevelActiveTeamCounts } from "../services/teamEnergy.service.js";

async function main() {
  await mongoose.connect(process.env.MONGO_URI!);
  console.log("connected");

  const userIds = (await User.find({}).select("_id").lean()).map((u) => u._id.toString());
  console.log(`users: ${userIds.length}`);

  const histogram = new Map<number, number>();
  for (const id of userIds) {
    try {
      const counts = await perLevelActiveTeamCounts(id, MAX_TEAM_ENERGY_STAR);
      const star = computeEnergyStar(counts);
      await User.updateOne({ _id: id }, { $set: { teamEnergyStar: star } });
      histogram.set(star, (histogram.get(star) ?? 0) + 1);
    } catch (err) {
      console.error(`failed for ${id}:`, err instanceof Error ? err.message : err);
    }
  }

  console.log("star histogram:");
  for (const star of Array.from(histogram.keys()).sort((a, b) => a - b)) {
    console.log(`  ${star}★: ${histogram.get(star)}`);
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});