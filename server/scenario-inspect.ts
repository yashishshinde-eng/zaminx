/**
 * Inspect the REAL system's compensation config + any side effects on existing
 * (non-scenario) users from the scenario run. Read-only.
 *   npx tsx scenario-inspect.ts
 */
import dotenv from "dotenv";
dotenv.config();

async function main() {
  const mongoose = (await import("mongoose")).default;
  await mongoose.connect(process.env.MONGO_URI!);
  const { User, Rank, BonanzaOffer, WalletTransaction, UserPackage } = await import("./src/models/index.js");

  console.log("\n=== ACTIVE RANK LADDER (real DB) ===");
  const ranks = await Rank.find({ status: "active" }).sort({ order: 1 }).lean();
  for (const r of ranks) console.log(`  order=${r.order} name=${r.name} requiredDirects=${r.requiredDirects} requiredTeamSize=${r.requiredTeamSize} rewardAmount=${r.rewardAmount}`);

  console.log("\n=== BONANZA OFFERS (real DB) ===");
  const offers = await BonanzaOffer.find().lean();
  for (const o of offers) console.log(`  name=${o.name} requiredDirects=${o.requiredDirects} rewardAmount=${o.rewardAmount} status=${o.status} window=${o.startDate?.toISOString?.()} → ${o.endDate?.toISOString?.()}`);

  console.log("\n=== EXISTING (non-scenario) USERS + their scenario-run side effects ===");
  const existing = await User.find({ email: { $not: /@scenario\.local$/ } }).lean();
  for (const u of existing) {
    const tx = (await WalletTransaction.aggregate([
      { $match: { user: u._id, createdAt: { $gte: new Date(Date.now() - 2 * 3600_000) } } },
      { $group: { _id: { type: "$type", dir: "$direction" }, total: { $sum: "$amount" } } },
    ])) as { _id: { type: string; dir: string }; total: number }[];
    const byType: Record<string, number> = {};
    for (const t of tx) byType[t._id.type] = (byType[t._id.type] ?? 0) + (t._id.dir === "credit" ? t.total : -t.total);
    const active = await UserPackage.exists({ user: u._id, status: "active" });
    console.log(`  ${u.email.padEnd(28)} role=${u.role} activePkg=${!!active} recentCredits=${JSON.stringify(byType)}`);
  }

  await mongoose.disconnect();
}
main().catch((e) => { console.error(e?.stack || e); process.exit(1); });