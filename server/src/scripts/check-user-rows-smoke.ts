/** One-off smoke: fetchUsersRows now returns activeDirectCount alongside directCount. */
import "dotenv/config";
import mongoose from "mongoose";
import { fetchUsersRows } from "../services/adminReport.service.js";

async function main() {
  await mongoose.connect(process.env.MONGO_URI!);
  const rows = await fetchUsersRows({ role: { $ne: "admin" } }, 8, 0);
  for (const r of rows) {
    console.log(`${r.email.padEnd(28)} directs=${r.directCount} active=${r.activeDirectCount}`);
  }
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});