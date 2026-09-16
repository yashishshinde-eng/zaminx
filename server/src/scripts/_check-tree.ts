/** One-off: check existing tree-test users and admin referral code. */
import "dotenv/config";
import mongoose from "mongoose";

async function main() {
  await mongoose.connect(process.env.MONGO_URI!);
  const U = mongoose.connection.collection("users");
  console.log("existing tree-test users:", await U.countDocuments({ email: { $regex: /tree-test\.zeminex\.dev$/i } }));
  console.log("total users:", await U.countDocuments({}));
  const admin = (await U.findOne({ email: "admin@zeminex.local" })) ?? (await U.findOne({ role: "admin" }));
  console.log("admin:", admin ? `${admin.name} | ${admin.email} | code=${admin.referralCode}` : "NOT FOUND");
  const sample = await U.find({ email: { $regex: /tree-test\.zeminex\.dev$/i } })
    .project({ name: 1, email: 1, referredBy: 1 })
    .limit(5)
    .toArray();
  for (const u of sample) console.log(` tree: ${u.name} | ${u.email} | referredBy=${u.referredBy}`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});