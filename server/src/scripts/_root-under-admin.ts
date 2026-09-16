/** One-off: create the tree root user under the admin, then print its referral code. */
import "dotenv/config";
import mongoose from "mongoose";
import { User } from "../models/index.js";

const PASSWORD = "Aa@123";
const EMAIL_DOMAIN = "tree-test.zeminex.dev";

async function main() {
  await mongoose.connect(process.env.MONGO_URI!);
  const admin = await User.findOne({ email: "admin@zeminex.local" });
  if (!admin) throw new Error("Admin not found");

  const rootEmail = `zam-root@${EMAIL_DOMAIN}`;
  const existing = await User.findOne({ email: rootEmail });
  if (existing) {
    console.log(`Root already exists: ${existing.email} | code=${existing.referralCode}`);
  } else {
    const root = new User({
      name: "Tree Root",
      email: rootEmail,
      password: PASSWORD,
      referredBy: admin.referralCode,
      sponsorId: admin._id,
      lineage: admin.lineage ?? [],
    });
    await root.save();
    console.log(`Root created: ${root.email} | code=${root.referralCode}`);
  }
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});