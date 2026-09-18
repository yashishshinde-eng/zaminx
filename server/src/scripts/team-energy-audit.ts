import "dotenv/config";
import mongoose from "mongoose";
import { User, WalletTransaction, UserPackage } from "../models/index.js";
import { batchPerLevelActiveTeamCounts } from "../services/starQualification.service.js";
import { getTeamEnergyPct, getTeamEnergyDepth } from "../services/setting.service.js";
import { bpFromPct, calcTeamEnergyBonusCents } from "../services/teamEnergy.service.js";
import { loadYieldScheduleContext, utcDayBounds, dayKey, scheduledYieldForPackage } from "../services/compensation.service.js";
import type { LeanActivePackage } from "../services/compensation.service.js";

/** 3^N without float drift for small N. */
function pow3(n: number): number {
  let r = 1;
  for (let i = 0; i < n; i++) r *= 3;
  return r;
}

async function main() {
  await mongoose.connect(process.env.MONGO_URI!);
  const root = await User.findOne({ email: "main-user@tree.zeminex.dev" }).select("_id name").lean();
  if (!root) throw new Error("main user not found");
  const rootId = root._id.toString();

  const [pcts, depth] = await Promise.all([getTeamEnergyPct(), getTeamEnergyDepth()]);
  console.log(`Config: teamEnergyPct=${JSON.stringify(pcts)} depth=${depth}\n`);

  // Latest team energy credits for the main user
  const credits = await WalletTransaction.find({
    user: new mongoose.Types.ObjectId(rootId),
    type: "team_bonus",
    direction: "credit",
    "meta.bonusType": "DAILY_TEAM_ENERGY",
  })
    .sort({ "meta.date": -1 })
    .limit(3)
    .lean();

  for (const c of credits) {
    const meta = c.meta as any;
    console.log(`=== ${meta.date} | star=${meta.starLevel} | paid=$${c.amount} | memo="${c.memo}"`);
    console.log(`    teamMemberCount=${meta.teamMemberCount} eligibleBonusBase=$${meta.eligibleBonusBase}`);
    const perLevel = (meta.perLevel ?? []) as { level: number; base: number; ratePct: number; bonus: number }[];
    let recomputed = 0;
    let recomputedCfg = 0;
    for (const row of perLevel) {
      const cfgPct = pcts[row.level - 1] ?? -1;
      // recompute from stored numbers
      const expectStored = calcTeamEnergyBonusCents(Math.round(row.base * 100), bpFromPct(row.ratePct)) / 100;
      // recompute with CURRENT config rate
      const expectCfg = calcTeamEnergyBonusCents(Math.round(row.base * 100), bpFromPct(cfgPct)) / 100;
      recomputed += expectStored;
      recomputedCfg += expectCfg;
      const okStored = Math.abs(expectStored - row.bonus) < 0.005 ? "ok" : "MISMATCH";
      const rateOk = cfgPct === row.ratePct ? "ok" : `CONFIG-RATE-DIFF (cfg=${cfgPct}%)`;
      console.log(
        `    L${row.level}: base=$${row.base.toFixed(4)} rate=${row.ratePct}% bonus=$${row.bonus.toFixed(4)}  [stored-math ${okStored}] [${rateOk}]`,
      );
    }
    console.log(
      `    Σ perLevel bonus=$${perLevel.reduce((s, r) => s + r.bonus, 0).toFixed(4)} | recomputed(stored rates)=${recomputed.toFixed(4)} | recomputed(config rates)=${recomputedCfg.toFixed(4)} | credit.amount=$${c.amount}`,
    );
    // sources per level
    const byLevel = new Map<number, { n: number; amt: number }>();
    for (const s of (meta.sources ?? []) as { level: number; amount: number }[]) {
      const e = byLevel.get(s.level) ?? { n: 0, amt: 0 };
      e.n++;
      e.amt += s.amount;
      byLevel.set(s.level, e);
    }
    for (const [lv, e] of [...byLevel.entries()].sort((a, b) => a[0] - b[0])) {
      console.log(`    sources L${lv}: n=${e.n} sum=$${e.amt.toFixed(4)}`);
    }
    console.log();
  }

  // Live team structure: per-level active counts vs 3^N
  const maxDepth = Math.min(depth, 10);
  const counts = await batchPerLevelActiveTeamCounts([rootId], maxDepth);
  const m = counts.get(rootId) ?? new Map();
  console.log("Live per-level ACTIVE counts (vs 3^N):");
  for (let l = 1; l <= maxDepth; l++) {
    console.log(`  L${l}: ${m.get(l) ?? 0} / ${pow3(l)}`);
  }

  // What SHOULD today's base be: scheduled yield per level for in-window packages
  const target = new Date();
  const { start } = utcDayBounds(target);
  const key = dayKey(start);
  const ctx = await loadYieldScheduleContext(target, key, { excludeDayKey: true });
  const pkgs = (await UserPackage.find({ status: "active" }).lean()) as LeanActivePackage[];
  // One bulk query for all downline lineages instead of per-package lookups.
  const usersWithLineage = (await User.find(
    { lineage: root._id },
    { lineage: 1 },
  ).lean()) as { _id: { toString(): string }; lineage?: mongoose.Types.ObjectId[] | string[] }[];
  const lineageLenByUser = new Map<string, number>();
  for (const u of usersWithLineage) {
    const lin = (u.lineage ?? []).map(String);
    const idx = lin.lastIndexOf(rootId);
    if (idx !== -1) lineageLenByUser.set(u._id.toString(), lin.length - idx);
  }
  const yieldByLevel = new Map<number, { users: number; amt: number }>();
  for (const up of pkgs) {
    const level = lineageLenByUser.get(up.user.toString());
    if (!level || level > maxDepth) continue;
    const y = scheduledYieldForPackage(ctx, up, start, up.activatedAt ? up.activatedAt.getTime() : 0, up.expiresAt ? up.expiresAt.getTime() : null);
    const e = yieldByLevel.get(level) ?? { users: 0, amt: 0 };
    e.users++;
    e.amt += y;
    yieldByLevel.set(level, e);
  }
  console.log(`\nToday (${key}) scheduled yield by level for root's downline:`);
  let expectedTotal = 0;
  for (let l = 1; l <= maxDepth; l++) {
    const e = yieldByLevel.get(l) ?? { users: 0, amt: 0 };
    const pct = pcts[l - 1] ?? 0;
    const bonus = Math.round(e.amt * 100 * bpFromPct(pct) / 10000) / 100;
    expectedTotal += bonus;
    console.log(`  L${l}: users=${e.users} yieldBase=$${e.amt.toFixed(4)} @${pct}% → $${bonus.toFixed(4)}`);
  }
  console.log(`Expected total today: $${expectedTotal.toFixed(4)}`);

  await mongoose.disconnect();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});