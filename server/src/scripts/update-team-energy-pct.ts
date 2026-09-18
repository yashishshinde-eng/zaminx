/**
 * One-off: set the live `compensation.teamEnergyPct` setting to the spec
 * table [10, 5, 4, 3, 2, 1, 0.5, 0.5, 0.5, 0.5] (L9/L10 raised from 0.25%).
 * Next closing picks it up via getTeamEnergyPct().
 *
 * Usage: npx tsx src/scripts/update-team-energy-pct.ts
 */
import "dotenv/config";
import mongoose from "mongoose";
import { getTeamEnergyPct } from "../services/setting.service.js";

const TABLE = [10, 5, 4, 3, 2, 1, 0.5, 0.5, 0.5, 0.5];

async function main() {
  await mongoose.connect(process.env.MONGO_URI!);
  await mongoose.model("Setting").updateOne(
    { key: "compensation.teamEnergyPct" },
    { $set: { value: TABLE } },
    { upsert: true },
  );
  console.log("setting now:", await getTeamEnergyPct());
  await mongoose.disconnect();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});