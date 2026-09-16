/** One-off: show the root's team_bonus credit and per-level breakdown. */
import "dotenv/config";
import mongoose from "mongoose";
import { WalletTransaction } from "../models/index.js";

async function main() {
  await mongoose.connect(process.env.MONGO_URI!);
  const rootId = "6aaa6c6fd0b59357ed4947e9";
  const t = await WalletTransaction.findOne({ user: rootId, type: "team_bonus" })
    .sort({ createdAt: -1 })
    .lean();
  if (!t) {
    console.log("No team_bonus for root");
  } else {
    const meta = t.meta as Record<string, unknown>;
    console.log("amount:", t.amount, "| memo:", t.memo);
    console.log("starLevel:", meta.starLevel, "| teamMemberCount:", meta.teamMemberCount);
    console.log("eligibleBonusBase:", meta.eligibleBonusBase, "| bonusAmount:", meta.bonusAmount);
    console.log("perLevel:", JSON.stringify(meta.perLevel, null, 2));
    const sources = (meta.sources ?? []) as { level: number; amount: number }[];
    const byLevel = new Map<number, { n: number; sum: number }>();
    for (const s of sources) {
      const cur = byLevel.get(s.level) ?? { n: 0, sum: 0 };
      cur.n++;
      cur.sum += s.amount;
      byLevel.set(s.level, cur);
    }
    for (const [lvl, v] of [...byLevel.entries()].sort((a, b) => a[0] - b[0])) {
      console.log(`sources L${lvl}: ${v.n} contributor(s), $${v.sum.toFixed(4)}`);
    }
  }
  const totalTe = await WalletTransaction.countDocuments({ type: "team_bonus" });
  console.log("total team_bonus rows in DB:", totalTe);
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});