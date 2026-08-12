import mongoose from "mongoose";
import "dotenv/config";

const uri = process.env.MONGO_URI;
const db = await mongoose.connect(uri);
const Rank = db.connection.collection("ranks");
const all = await Rank.find({}).sort({ order: 1 }).toArray();
console.log("Active ranks in live DB:");
for (const r of all) {
  console.log(
    `  order=${r.order} name="${r.name}" team=${r.requiredTeamSize} directs=${r.requiredDirects} reward=$${r.rewardAmount} status=${r.status}`,
  );
}
await db.disconnect();