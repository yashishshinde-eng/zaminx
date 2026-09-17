/** One-off: aggregate Team Energy income across the tree, per level. */
import "dotenv/config";
import mongoose from "mongoose";
import { WalletTransaction } from "../models/index.js";

async function main() {
  await mongoose.connect(process.env.MONGO_URI!);
  const rows = await WalletTransaction.find({ type: "team_bonus" }).lean();
  console.log("team_bonus rows:", rows.length);

  // Per-earner summary
  type Earn = { star: number; memberCount: number; amount: number; base: number; byLevel: Map<number, { n: number; bonus: number }> };
  const earners = new Map<string, Earn>();
  for (const r of rows) {
    const uid = r.user.toString();
    const meta = r.meta as Record<string, unknown>;
    const e = earners.get(uid) ?? {
      star: Number(meta.starLevel ?? 0),
      memberCount: Number(meta.teamMemberCount ?? 0),
      amount: 0,
      base: 0,
      byLevel: new Map(),
    };
    e.amount += Number(r.amount);
    e.base += Number(meta.eligibleBonusBase ?? 0);
    for (const p of (meta.perLevel ?? []) as { level: number; base: number; ratePct: number; bonus: number }[]) {
      const cur = e.byLevel.get(p.level) ?? { n: 0, bonus: 0 };
      cur.bonus += p.bonus;
      e.byLevel.set(p.level, cur);
    }
    earners.set(uid, e);
  }

  // Bucket earners by star
  const byStar = new Map<number, { count: number; sum: number }>();
  for (const [, e] of earners) {
    const cur = byStar.get(e.star) ?? { count: 0, sum: 0 };
    cur.count++;
    cur.sum += e.amount;
    byStar.set(e.star, cur);
  }
  console.log("\nEarners by star:");
  for (const [star, v] of [...byStar.entries()].sort((a, b) => a[0] - b[0])) {
    console.log(`  ${star}★: ${v.count} user(s), total paid $${v.sum.toFixed(2)}`);
  }

  // Total paid per credit level across all earners
  const totals = new Map<number, { n: number; base: number; bonus: number }>();
  for (const [, e] of earners) {
    for (const [lvl, v] of e.byLevel) {
      const cur = totals.get(lvl) ?? { n: 0, base: 0, bonus: 0 };
      cur.n += 1;
      cur.base += v.bonus / 1; // base not stored per level here; use perLevel base below
      cur.bonus += v.bonus;
      totals.set(lvl, cur);
    }
  }

  // Use perLevel meta base properly
  const bases = new Map<number, number>();
  for (const r of rows) {
    for (const p of ((r.meta as Record<string, unknown>).perLevel ?? []) as { level: number; base: number }[]) {
      bases.set(p.level, (bases.get(p.level) ?? 0) + p.base);
    }
  }
  console.log("\nIncome paid AT each credit level (all 121 earners combined):");
  for (const [lvl, v] of [...totals.entries()].sort((a, b) => a[0] - b[0])) {
    console.log(`  L${lvl}: paid to ${v.n} earner-days, bonus $${v.bonus.toFixed(2)} (base $${(bases.get(lvl) ?? 0).toFixed(2)})`);
  }

  // Examples: one earner per star
  console.log("\nSample earner per star (root is the only 5★):");
  const root = earners.get("6aaa6c6fd0b59357ed4947e9");
  if (root) console.log(`  root 5★: members=${root.memberCount}, amount=$${root.amount.toFixed(2)}, base=$${root.base.toFixed(2)}`);
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});