/** One-off: list active packages in the DB. */
import "dotenv/config";
import mongoose from "mongoose";
import { Package } from "../models/index.js";

async function main() {
  await mongoose.connect(process.env.MONGO_URI!);
  const pkgs = await Package.find({ status: "active" }).select("name slug priceUsd dailyReturnPct durationDays").lean();
  for (const p of pkgs) console.log(`${p.name} | slug=${p.slug} | $${p.priceUsd} | ${p.dailyReturnPct}%/day | ${p.durationDays}d`);
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});