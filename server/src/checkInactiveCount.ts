import mongoose from "mongoose";
import { connectDB } from "./config/db.js";
import { User, Package } from "./models/index.js";

async function main() {
  await connectDB();
  const total = await User.countDocuments({});
  const active = await User.countDocuments({ status: "active" });
  const inactive = await User.countDocuments({ status: "inactive" });
  const blocked = await User.countDocuments({ status: "blocked" });
  console.log({ total, active, inactive, blocked });
  const pkgs = await Package.find({ status: "active" }).select("name slug priceUsd").lean();
  console.log("Active packages:", JSON.stringify(pkgs));
  await mongoose.disconnect();
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
