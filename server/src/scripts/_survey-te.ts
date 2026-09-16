/** One-off: current DB state survey (post-incident assessment). */
import "dotenv/config";
import mongoose from "mongoose";
import { config } from "dotenv";
config();

await mongoose.connect(process.env.MONGO_URI!);
const conn = mongoose.connection;
const cols = await conn.db!.collections();
for (const c of cols) {
  const n = await c.countDocuments();
  console.log(`${c.collectionName}: ${n}`);
}
await mongoose.disconnect();