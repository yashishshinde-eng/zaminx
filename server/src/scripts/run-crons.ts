import "dotenv/config";
import mongoose from "mongoose";
import { runDailyYield } from "../services/compensation.service.js";
import { runDailyTeamEnergy } from "../services/compensation.service.js";
import { runRankCheckAll } from "../services/rank.service.js";

async function main() {
  await mongoose.connect(process.env.MONGO_URI!);
  const root = "6aac2d0f6f6e90fc1e148253";

  console.log("=== 1. DAILY YIELD ===");
  const yieldResult = await runDailyYield();
  console.log("Yield:", JSON.stringify(yieldResult));

  console.log("\n=== 2. DAILY TEAM ENERGY ===");
  const teResult = await runDailyTeamEnergy();
  console.log("Team Energy:", JSON.stringify(teResult));

  console.log("\n=== 3. RANK CHECK ALL ===");
  const rankResult = await runRankCheckAll();
  console.log("Rank:", JSON.stringify(rankResult));

  // Check root team_bonus
  const WT = mongoose.model("WalletTransaction", new mongoose.Schema({}, { strict: false }));
  const rootTeamBonus = (await WT.find().sort({ createdAt: 1 }).lean()).filter(
    (t: any) => String(t.user) === root && t.type === "team_bonus",
  );
  console.log("\n=== ROOT TEAM BONUS ===");
  console.log("count:", rootTeamBonus.length);
  for (const t of rootTeamBonus as any[]) {
    console.log(`  $${t.amount} | ${t.memo} | meta: ${JSON.stringify(t.meta)}`);
  }

  // Root wallet summary
  const rootTxns = (await WT.find().sort({ createdAt: 1 }).lean()).filter(
    (t: any) => String(t.user) === root,
  );
  const byType: Record<string, { credit: number; debit: number; count: number }> = {};
  for (const t of rootTxns as any[]) {
    const k = t.type;
    if (!byType[k]) byType[k] = { credit: 0, debit: 0, count: 0 };
    if (t.direction === "credit") byType[k].credit += t.amount;
    else byType[k].debit += t.amount;
    byType[k].count++;
  }
  console.log("\n=== ROOT ALL TRANSACTIONS BY TYPE ===");
  let main = 0, bonus = 0, trading = 0;
  for (const [k, v] of Object.entries(byType)) {
    console.log(`${k}: ${v.count} txns, credit=$${v.credit}, debit=$${v.debit}, net=$${v.credit - v.debit}`);
  }
  for (const t of rootTxns as any[]) {
    const amt = t.direction === "credit" ? t.amount : -t.amount;
    if (t.wallet === "main") main += amt;
    else if (t.wallet === "bonus") bonus += amt;
    else if (t.wallet === "trading") trading += amt;
  }
  console.log(`\nRoot wallet: main=$${main} bonus=$${bonus} trading=$${trading} total=$${main + bonus + trading}`);

  // All team_bonus stats
  const allTB = await WT.aggregate([
    { $match: { type: "team_bonus" } },
    { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } },
  ]);
  console.log(`\nAll team_bonus: count=${allTB[0]?.count ?? 0} total=$${allTB[0]?.total ?? 0}`);

  await mongoose.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });