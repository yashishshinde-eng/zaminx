/**
 * One-off: find users whose name/email looks like "denial".
 */
import "dotenv/config";
import mongoose from "mongoose";
import { User } from "../models/index.js";

async function main() {
  await mongoose.connect(process.env.MONGO_URI!);
  console.log("connected");

  const users = await User.find({
    $or: [
      { name: { $regex: /deni/i } },
      { email: { $regex: /deni/i } },
      { name: { $regex: /dani|deny|denny|dennis|danel|danial/i } },
    ],
  })
    .select("name email status highestStar")
    .limit(20)
    .lean();

  if (!users.length) {
    const total = await User.countDocuments({});
    console.log(`no match; total users in DB: ${total}`);
    const sample = await User.find({})
      .select("name email highestStar")
      .limit(30)
      .lean();
    console.log("sample users:", sample.map((u) => `${u.name} <${u.email}> ${u.highestStar ?? 0}★`).join("\n"));
  } else {
    for (const u of users) {
      console.log(`match: ${u.name} <${u.email}> status=${u.status} highestStar=${(u as { highestStar?: number }).highestStar}`);
    }
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});