/** One-off: verify per-level ACTIVE package counts in the tree. */
import "dotenv/config";
import mongoose from "mongoose";
import { User, UserPackage } from "../models/index.js";

async function main() {
  await mongoose.connect(process.env.MONGO_URI!);
  const root = await User.findOne({ referralCode: "ZAM4JL88ABF" });
  if (!root) throw new Error("Root not found");

  const active = await UserPackage.find({ status: "active" }).select("user").lean();
  console.log("active UserPackages total:", active.length);

  const rootLineage = root.lineage ?? [];
  for (let level = 0; level <= 5; level++) {
    if (level === 0) {
      const n = await UserPackage.countDocuments({ user: root._id, status: "active" });
      console.log(`L0 (root): ${n} active`);
      continue;
    }
    const users = await User.find({
      lineage: { $all: [...rootLineage, root._id] },
      $expr: { $eq: [{ $size: "$lineage" }, rootLineage.length + level] },
    })
      .select("_id")
      .lean();
    const ids = users.map((u: { _id: unknown }) => u._id);
    const n = await UserPackage.countDocuments({ user: { $in: ids }, status: "active" });
    console.log(`L${level}: ${n} active of ${ids.length} users`);
  }

  // Root's current star (persisted read model after activation flow)
  const freshRoot = await User.findById(root._id).select("teamEnergyStar highestStar status").lean();
  console.log("root:", freshRoot);
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});