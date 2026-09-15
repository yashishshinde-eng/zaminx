/**
 * One-off backfill: reconstruct the per-contributor `sources` breakdown for
 * `team_bonus` (DAILY_TEAM_ENERGY) ledger credits recorded before that field
 * existed. The ledger is append-only and is never touched here — this
 * rebuilds each affected day's per-ancestor contributor map from lineage +
 * package history (the same computation `runDailyTeamEnergy` used
 * originally, which is deterministic: the daily performance factor is a hash
 * of the date key, and month-to-date credited amounts come straight from the
 * immutable ledger) and writes the result to the separate
 * `TeamEnergySourceCache` read-model, which the reports API falls back to
 * when a row has no `meta.sources` of its own.
 *
 * Safety: a day's reconstructed sources are only accepted for a row when
 * their total matches that row's original `meta.eligibleBonusBase` within a
 * cent per source — if admin yield-schedule settings changed since credit
 * time, or any other drift is present, the row is left unattributed rather
 * than shown with numbers that might not reconcile with what was actually
 * paid. Idempotent (skips rows already cached) — safe to re-run.
 *
 * Usage: npx tsx src/scripts/backfill-team-energy-sources.ts
 */
import "dotenv/config";
import mongoose from "mongoose";
import { WalletTransaction, User, UserPackage, TeamEnergySourceCache } from "../models/index.js";
import {
  loadYieldScheduleContext,
  scheduledYieldForPackage,
  utcDayBounds,
  dayKey,
  type LeanActivePackage,
  type LeanLineageUser,
} from "../services/compensation.service.js";
import { MAX_STAR } from "../services/starQualification.service.js";

type LeanRow = {
  _id: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  amount: number;
  meta?: {
    date?: string;
    starLevel?: number;
    eligibleBonusBase?: number;
  };
};

async function main() {
  await mongoose.connect(process.env.MONGO_URI!);
  console.log("connected");

  const rows = (await WalletTransaction.find({
    type: "team_bonus",
    direction: "credit",
    "meta.bonusType": "DAILY_TEAM_ENERGY",
    "meta.sources": { $exists: false },
  })
    .select("_id user amount meta")
    .lean()) as unknown as LeanRow[];

  console.log(`rows needing backfill: ${rows.length}`);
  if (rows.length === 0) {
    await mongoose.disconnect();
    return;
  }

  const alreadyCached = new Set(
    (await TeamEnergySourceCache.find({ ledgerEntryId: { $in: rows.map((r) => r._id) } }).distinct("ledgerEntryId")).map(
      (id) => id.toString(),
    ),
  );

  const byDate = new Map<string, LeanRow[]>();
  for (const r of rows) {
    const date = r.meta?.date;
    if (!date || alreadyCached.has(r._id.toString())) continue;
    let list = byDate.get(date);
    if (!list) {
      list = [];
      byDate.set(date, list);
    }
    list.push(r);
  }

  let written = 0;
  let mismatched = 0;
  let skippedNoStar = 0;

  for (const [date, dateRows] of byDate) {
    console.log(`\n-- ${date}: ${dateRows.length} row(s) --`);
    const target = new Date(`${date}T00:00:00.000Z`);
    const { start, end } = utcDayBounds(target);
    const key = dayKey(start);

    // Every package active in this day's window, regardless of its CURRENT
    // status (it may have since expired) — reconstructing history must use
    // the day's actual window, not today's live "active" set.
    const packages = (await UserPackage.find({
      activatedAt: { $ne: null, $lt: new Date(end) },
      $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date(start) } }],
    }).lean()) as unknown as LeanActivePackage[];

    if (packages.length === 0) {
      console.log("  no in-window packages — skipping");
      continue;
    }

    const yieldCtx = await loadYieldScheduleContext(target, key, { excludeDayKey: true });

    const buyerIds = Array.from(new Set(packages.map((p) => p.user.toString())));
    const lineageUsers = (await User.find({ _id: { $in: buyerIds } })
      .select("lineage name referralCode")
      .lean()) as unknown as LeanLineageUser[];
    const lineageByUser = new Map<string, string[]>();
    const buyerInfoByUser = new Map<string, { name: string; referralCode: string }>();
    for (const u of lineageUsers) {
      lineageByUser.set(u._id.toString(), (u.lineage ?? []).map((a) => a.toString()));
      buyerInfoByUser.set(u._id.toString(), { name: u.name, referralCode: u.referralCode });
    }

    // Same accumulation as runDailyTeamEnergy: per ancestor, per downline
    // buyer, their level + that day's scheduled yield (cents).
    const sourcesByAncestor = new Map<string, Map<string, { level: number; yieldCents: number }>>();
    for (const up of packages) {
      const activatedAt = up.activatedAt instanceof Date ? up.activatedAt.getTime() : null;
      const expiresAt = up.expiresAt instanceof Date ? up.expiresAt.getTime() : null;
      if (activatedAt == null) continue;
      const yieldAmt = scheduledYieldForPackage(yieldCtx, up, start, activatedAt, expiresAt);
      if (yieldAmt <= 0) continue;
      const lineage = lineageByUser.get(up.user.toString()) ?? [];
      for (let level = 1; level <= MAX_STAR; level++) {
        const ancestorId = lineage[lineage.length - level];
        if (!ancestorId) break;
        let sources = sourcesByAncestor.get(ancestorId);
        if (!sources) {
          sources = new Map();
          sourcesByAncestor.set(ancestorId, sources);
        }
        const prev = sources.get(up.user.toString());
        sources.set(up.user.toString(), { level, yieldCents: (prev?.yieldCents ?? 0) + Math.round(yieldAmt * 100) });
      }
    }

    for (const row of dateRows) {
      const ancestorId = row.user.toString();
      const effectiveStar = row.meta?.starLevel;
      if (!effectiveStar) {
        skippedNoStar++;
        continue;
      }
      const eligible = Array.from(sourcesByAncestor.get(ancestorId)?.entries() ?? []).filter(([, v]) => v.level <= effectiveStar);
      if (eligible.length === 0) continue;

      const baseCents = eligible.reduce((sum, [, v]) => sum + v.yieldCents, 0);
      const expectedBaseCents = Math.round((row.meta?.eligibleBonusBase ?? 0) * 100);
      if (Math.abs(baseCents - expectedBaseCents) > eligible.length) {
        mismatched++;
        console.warn(`  mismatch user=${ancestorId} recomputed=${baseCents} expected=${expectedBaseCents} — skipped`);
        continue;
      }

      const bonusCents = Math.round(row.amount * 100);
      const sources = eligible
        .map(([buyerId, { level, yieldCents }]) => {
          const info = buyerInfoByUser.get(buyerId);
          return {
            fromUserId: buyerId,
            fromUserName: info?.name ?? null,
            fromReferralCode: info?.referralCode ?? null,
            level,
            amount: Math.round((bonusCents * yieldCents) / baseCents) / 100,
          };
        })
        .sort((a, b) => a.level - b.level || b.amount - a.amount);

      await TeamEnergySourceCache.updateOne(
        { ledgerEntryId: row._id },
        { $setOnInsert: { ledgerEntryId: row._id, sources } },
        { upsert: true },
      );
      written++;
    }
  }

  console.log(`\ndone. written=${written} mismatched=${mismatched} skippedNoStar=${skippedNoStar}`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
