/**
 * One-off diagnostic: why does user "radhe" show 1 Star with only 1 direct?
 * Prints his raw + active team counts and the active rank ladder the dashboard
 * walks to pick his displayed rank.
 */
import "dotenv/config";
import mongoose from "mongoose";
import { User, Rank, UserPackage } from "../models/index.js";
import { getTeamCounts } from "../services/referral.service.js";

async function main() {
  await mongoose.connect(process.env.MONGO_URI!);
  console.log("connected");

  const radhe = await User.findOne({ name: { $regex: /^radhe/i } })
    .select("name email status highestStar lineage sponsorId")
    .lean();
  if (!radhe) {
    console.log("no user named radhe found");
    return;
  }
  console.log("user:", {
    name: radhe.name,
    email: radhe.email,
    status: radhe.status,
    highestStar: (radhe as { highestStar?: number }).highestStar,
    lineageSize: Array.isArray(radhe.lineage) ? radhe.lineage.length : 0,
  });

  const counts = await getTeamCounts(String(radhe._id));
  console.log("team counts (dashboard uses activeDirectCount/activeTeamCount):", counts);

  const ladder = await Rank.find({ status: "active" }).sort({ order: 1 }).lean();
  console.log("active ladder:");
  for (const r of ladder) {
    const qualifies =
      counts.activeDirectCount >= (r.requiredDirects as number) &&
      counts.activeTeamCount >= (r.requiredTeamSize as number);
    console.log(
      `  order=${r.order} name=${r.name} requiredDirects=${r.requiredDirects} requiredTeamSize=${r.requiredTeamSize} reward=${r.rewardAmount} -> ${qualifies ? "QUALIFIES" : "no"}`,
    );
  }

  const pkg = await UserPackage.exists({ user: radhe._id, status: "active" });
  console.log("active package:", Boolean(pkg));

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});