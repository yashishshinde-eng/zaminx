/** One-off verify: owed vs deducted totals for the over-depth reversal. */
import "dotenv/config";
import mongoose from "mongoose";
import { User, WalletTransaction } from "../models/index.js";

async function main() {
  await mongoose.connect(process.env.MONGO_URI!);
  const credits = await WalletTransaction.find({ type: "team_bonus", direction: "credit", "meta.level": { $gt: 0 } }).lean();
  const users = await User.find({}).select("highestStar").lean();
  const star = new Map(users.map((u) => [u._id.toString(), u.highestStar ?? 0]));
  let owed = 0;
  let kept = 0;
  let n = 0;
  for (const c of credits) {
    const lvl = (c.meta as { level?: number } | undefined)?.level;
    if (!lvl) continue;
    if (lvl > (star.get((c.user as { toString(): string }).toString()) ?? 0)) {
      owed += c.amount;
      n++;
    } else {
      kept += c.amount;
    }
  }
  console.log("over-depth total owed:", owed.toFixed(4), "credits:", n);
  console.log("legit (within star) kept total:", kept.toFixed(4));
  const debits = await WalletTransaction.find({ type: "team_bonus", direction: "debit" }).lean();
  const rev = debits.reduce((s, d) => s + d.amount, 0);
  console.log("reversal debits:", debits.length, "total:", rev.toFixed(4));
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});