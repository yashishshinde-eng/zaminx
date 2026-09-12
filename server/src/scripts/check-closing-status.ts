/** One-off: show the latest CronLog row per job so we know what already ran. */
import "dotenv/config";
import mongoose from "mongoose";

const URI = process.env.MONGO_URI;
if (!URI) {
  console.error("MONGO_URI missing");
  process.exit(1);
}

async function main() {
  await mongoose.connect(URI!);
  const rows = await mongoose.connection
    .db!.collection("cronlogs")
    .aggregate([
      { $sort: { createdAt: -1 } },
      { $group: { _id: "$job", job: { $first: "$job" }, status: { $first: "$status" }, createdAt: { $first: "$createdAt" }, processed: { $first: "$processed" }, meta: { $first: "$meta" } } },
      { $sort: { job: 1 } },
    ])
    .toArray();
  for (const r of rows) {
    console.log(`${r.job.padEnd(26)} ${String(r.status).padEnd(8)} last=${r.createdAt?.toISOString()} processed=${r.processed}`);
  }
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});