import "dotenv/config";
import mongoose from "mongoose";
import { User } from "../models/index.js";

async function main() {
  await mongoose.connect(process.env.MONGO_URI!);
  const admins = (await User.find({ role: "admin" }).select("_id").lean()).map((a) => a._id.toString());
  console.log("admins:", admins.length);
  const adminOids = admins.map((a) => new mongoose.Types.ObjectId(a));
  const col = mongoose.connection.collection("wallettransactions");
  const r1 = await col.deleteMany({ user: { $nin: adminOids } });
  console.log("non-admin txs deleted:", r1.deletedCount);
  const r2 = await col.deleteMany({ type: "bonanza" });
  console.log("bonanza txs deleted:", r2.deletedCount);
  console.log("txs remaining:", await col.countDocuments({}));
  await mongoose.disconnect();
}
main();