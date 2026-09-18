import "dotenv/config";
import mongoose from "mongoose";
import { User, WalletTransaction } from "../models/index.js";

async function main() {
  await mongoose.connect(process.env.MONGO_URI!);
  const root = await User.findOne({ email: "main-user@tree.zeminex.dev" }).select("_id").lean();
  const rootId = root!._id;

  // All transactions for root
  const txns = await WalletTransaction.find({ userId: rootId }).sort({ createdAt: 1 }).lean();
  console.log(`Total root transactions: ${txns.length}\n`);
  for (const t of txns) {
    console.log(`${t.createdAt.toISOString()} | ${t.type} | ${t.direction} | $${t.amount} | ${t.memo ?? ""} | meta: ${JSON.stringify(t.meta ?? {})}`);
  }

  // Wallet
  const w = await mongoose.model("Wallet").findOne({ user: rootId }).lean() as any;
  console.log(`\nWallet:`, JSON.stringify(w?.balances));

  // Active count
  const activeCount = await User.countDocuments({ status: "active", email: { $regex: /tree\.zeminex\.dev$/i } });
  console.log(`Active tree users: ${activeCount}`);

  await mongoose.disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });