/**
 * One-off display repair: `DAILY_TEAM_ENERGY` credits recorded each
 * contributor's share (`meta.sources[].amount`) rounded to whole cents PER
 * SOURCE before the full-precision fix. With a small daily-yield base that
 * corrupts the report drill-down: a $0.50 yield at 1% is $0.005 (shown as
 * $0.01 — double) and at 0.5% is $0.0025 (shown as $0.00 — invisible), so
 * the per-member "individual levels income" stops matching the per-level
 * table even though the day's total credit was always correct.
 *
 * The ledger is financially immutable — this script touches ONLY the
 * display-only `meta.sources[].amount` field: for every credit row that
 * carries `meta.sources`, it reconstructs that day's package/lineage state
 * exactly as `runDailyTeamEnergy` would have, recomputes each listed
 * contributor's yield × their level's rate (the rate from the row's own
 * `meta.perLevel`, i.e. the rate actually used at payout time), and rewrites
 * ONLY that meta subfield at full precision. `amount`, balances, `perLevel`
 * and every financial field stay untouched; re-runs are idempotent.
 *
 * Usage: npx tsx src/scripts/fix-team-energy-source-rounding.ts
 */
import "dotenv/config";
import mongoose from "mongoose";
import { UserPackage, WalletTransaction } from "../models/index.js";
import { getTeamEnergyPct } from "../services/setting.service.js";
import { bpFromPct } from "../services/teamEnergy.service.js";
import {
  loadYieldScheduleContext,
  scheduledYieldForPackage,
  utcDayBounds,
  dayKey,
  type LeanActivePackage,
} from "../services/compensation.service.js";

type SourceEntry = {
  fromUserId: string;
  fromUserName: string | null;
  fromReferralCode: string | null;
  level: number;
  amount: number;
};

type LeanRow = {
  _id: mongoose.Types.ObjectId;
  meta?: {
    date?: string;
    perLevel?: { level: number; base: number; ratePct: number; bonus: number }[];
    sources?: SourceEntry[];
  };
};

async function main() {
  await mongoose.connect(process.env.MONGO_URI!);
  console.log("connected");

  const pcts = await getTeamEnergyPct();

  const rows = (await WalletTransaction.find({
    type: "team_bonus",
    direction: "credit",
    "meta.bonusType": "DAILY_TEAM_ENERGY",
    "meta.sources.0": { $exists: true },
  })
    .select("_id meta")
    .lean()) as unknown as LeanRow[];

  console.log(`rows with sources: ${rows.length}`);
  if (rows.length === 0) {
    await mongoose.disconnect();
    return;
  }

  // Group by earning date — the yield reconstruction is per-day state.
  const byDate = new Map<string, LeanRow[]>();
  for (const r of rows) {
    const date = r.meta?.date;
    if (!date) continue;
    let list = byDate.get(date);
    if (!list) {
      list = [];
      byDate.set(date, list);
    }
    list.push(r);
  }

  let rowsFixed = 0;
  let entriesFixed = 0;
  let alreadyExact = 0;

  for (const [date, dateRows] of byDate) {
    const target = new Date(`${date}T00:00:00.000Z`);
    const { start, end } = utcDayBounds(target);
    const key = dayKey(start);

    // Every package in that day's yield window, regardless of current status.
    const packages = (await UserPackage.find({
      activatedAt: { $ne: null, $lt: new Date(end) },
      $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date(start) } }],
    }).lean()) as unknown as LeanActivePackage[];
    if (packages.length === 0) {
      console.log(`${date}: no in-window packages — skipping ${dateRows.length} row(s)`);
      continue;
    }

    const yieldCtx = await loadYieldScheduleContext(target, key, { excludeDayKey: true });

    // Scheduled yield (cents) per buyer for that day — one map, reused by
    // every row on this date.
    const yieldCentsByBuyer = new Map<string, number>();
    for (const up of packages) {
      const activatedAt = up.activatedAt instanceof Date ? up.activatedAt.getTime() : null;
      const expiresAt = up.expiresAt instanceof Date ? up.expiresAt.getTime() : null;
      if (activatedAt == null) continue;
      const amt = scheduledYieldForPackage(yieldCtx, up, start, activatedAt, expiresAt);
      if (amt <= 0) continue;
      const uid = up.user.toString();
      yieldCentsByBuyer.set(uid, (yieldCentsByBuyer.get(uid) ?? 0) + Math.round(amt * 100));
    }

    const bulk = [] as { updateOne: { filter: { _id: mongoose.Types.ObjectId }; update: { $set: Record<string, unknown> } } }[];
    for (const row of dateRows) {
      const sources = row.meta?.sources ?? [];
      const rateByLevel = new Map<number, number>();
      for (const p of row.meta?.perLevel ?? []) rateByLevel.set(p.level, p.ratePct);

      let rowChanges = 0;
      const rebuilt = sources.map((s) => {
        const ratePct = rateByLevel.get(s.level) ?? pcts[s.level - 1] ?? 0;
        const exact = ((yieldCentsByBuyer.get(s.fromUserId) ?? 0) * bpFromPct(ratePct)) / 1_000_000;
        if (Math.abs(exact - s.amount) < 1e-9) {
          alreadyExact++;
          return s;
        }
        rowChanges++;
        return { ...s, amount: exact };
      });
      // Rewrite only when at least one entry changed (idempotent re-runs).
      if (rowChanges === 0) continue;
      entriesFixed += rowChanges;
      bulk.push({
        updateOne: {
          filter: { _id: row._id },
          update: { $set: { "meta.sources": rebuilt } },
        },
      });
    }
    if (bulk.length > 0) {
      const res = await WalletTransaction.bulkWrite(bulk, { ordered: false });
      rowsFixed += res.modifiedCount;
      console.log(`${date}: fixed ${res.modifiedCount} row(s)`);
    }
  }

  console.log(
    `\ndone. rows fixed=${rowsFixed} entries fixed=${entriesFixed} already exact=${alreadyExact}`,
  );
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});