/**
 * One-off diagnostic: how did user "Denial" achieve 8 Star?
 * Prints their raw + active team counts and the active rank ladder the dashboard
 * walks to pick their displayed rank.
 */
import "dotenv/config";
import mongoose from "mongoose";
import { User, Rank, UserPackage } from "../models/index.js";
import { getTeamCounts } from "../services/referral.service.js";

async function main() {
  await mongoose.connect(process.env.MONGO_URI!);
  console.log("connected");

  const denial = await User.findOne({ email: "daniel@gmail.com" })
    .select("name email status highestStar lineage sponsorId")
    .lean();
  if (!denial) {
    console.log("no user named denial found");
    return;
  }
  console.log("user:", {
    name: denial.name,
    email: denial.email,
    status: denial.status,
    highestStar: (denial as { highestStar?: number }).highestStar,
    lineageSize: Array.isArray(denial.lineage) ? denial.lineage.length : 0,
  });

  const counts = await getTeamCounts(String(denial._id));
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

  const pkg = await UserPackage.exists({ user: denial._id, status: "active" });
  console.log("active package:", Boolean(pkg));

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});