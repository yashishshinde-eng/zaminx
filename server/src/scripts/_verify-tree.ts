/** One-off: verify the seeded tree counts per level under the root. */
import "dotenv/config";
import mongoose from "mongoose";
import { User } from "../models/index.js";

async function main() {
  await mongoose.connect(process.env.MONGO_URI!);
  const root = await User.findOne({ referralCode: "ZAM4JL88ABF" });
  if (!root) throw new Error("Root not found");

  for (let level = 0; level <= 5; level++) {
    const n = await User.countDocuments(
      level === 0
        ? { _id: root._id }
        : { lineage: { $all: [...root.lineage, root._id] }, $expr: { $eq: [{ $size: "$lineage" }, (root.lineage?.length ?? 0) + level] } },
    );
    console.log(`L${level}: ${n} user(s)`);
  }
  const total = await User.countDocuments({ email: { $regex: /tree-test\.zeminex\.dev$/i } });
  console.log(`Total (incl. root): ${total}`);
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});