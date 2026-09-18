/**
 * One-off correction: before commit cc17f94 ("Pay Team Energy bonus at
 * per-level table rates within star depth"), a receiver's `team_bonus`
 * credit was split across contributors PROPORTIONALLY BY YIELD SHARE
 * (`amount: (bonusCents * yieldCents) / baseCents`) instead of at each
 * contributor's OWN level rate. When downline members hold equal-sized
 * packages (equal yield), that proportional split hands every level the
 * identical dollar amount — masking the per-level table entirely.
 *
 * This script finds `DAILY_TEAM_ENERGY` credits that predate the fix
 * (identified by the absence of `meta.perLevel`, which the fixed code always
 * writes), reconstructs that day's package/lineage state exactly as
 * `runDailyTeamEnergy` would have, and recomputes what SHOULD have been
 * credited under the per-level table. The ledger is append-only (see
 * WalletTransaction model) — the wrong credit is never edited or deleted;
 * instead a reversing debit is posted for the original amount and a fresh
 * credit is posted for the corrected amount, both referencing the original
 * row so the audit trail is complete and re-runs are idempotent.
 *
 * Balance-guarded like reverse-team-energy-overdepth.ts: if a user's Bonus
 * wallet no longer holds the full wrong amount (already spent/withdrawn),
 * only the available part is reversed and the remainder is reported as
 * uncollectible rather than pushing the balance negative.
 *
 * Usage: npx tsx src/scripts/fix-team-energy-flatrate-bug.ts
 */
import "dotenv/config";
import mongoose from "mongoose";
import { User, UserPackage, Wallet, WalletTransaction } from "../models/index.js";
import { applyLedgerEntry } from "../services/wallet.service.js";
import { getTeamEnergyPct } from "../services/setting.service.js";
import { MAX_STAR } from "../services/starQualification.service.js";
import { bpFromPct, calcTeamEnergyBonusCents } from "../services/teamEnergy.service.js";
import {
  loadYieldScheduleContext,
  scheduledYieldForPackage,
  utcDayBounds,
  dayKey,
  type LeanActivePackage,
  type LeanLineageUser,
} from "../services/compensation.service.js";

type LeanRow = {
  _id: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  amount: number;
  meta?: {
    date?: string;
    starLevel?: number;
    bonusPercentage?: number;
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
    "meta.perLevel": { $exists: false },
  })
    .select("_id user amount meta")
    .lean()) as unknown as LeanRow[];

  console.log(`pre-fix rows found: ${rows.length}`);
  if (rows.length === 0) {
    await mongoose.disconnect();
    return;
  }

  const alreadyCorrected = new Set(
    (
      await WalletTransaction.find({ "meta.correctionOf": { $in: rows.map((r) => r._id.toString()) } })
        .distinct("meta.correctionOf")
    ).map(String),
  );

  const byDate = new Map<string, LeanRow[]>();
  for (const r of rows) {
    const date = r.meta?.date;
    if (!date || alreadyCorrected.has(r._id.toString())) continue;
    let list = byDate.get(date);
    if (!list) {
      list = [];
      byDate.set(date, list);
    }
    list.push(r);
  }

  // Wallet balances, loaded once and drained in-memory as we deduct so
  // successive corrections for the same user don't over-deduct.
  const receiverIds = Array.from(new Set(rows.map((r) => r.user.toString())));
  const wallets = await Wallet.find({ user: { $in: receiverIds } }).lean();
  const availByUser = new Map<string, number>(
    wallets.map((w) => [
      (w.user as { toString(): string }).toString(),
      (w.balances as { bonus?: { available?: number } }).bonus?.available ?? 0,
    ]),
  );

  let corrected = 0;
  let unchanged = 0;
  let uncollectible = 0;
  let skippedNoStar = 0;

  for (const [date, dateRows] of byDate) {
    console.log(`\n-- ${date}: ${dateRows.length} row(s) --`);
    const target = new Date(`${date}T00:00:00.000Z`);
    const { start, end } = utcDayBounds(target);
    const key = dayKey(start);

    // Every package active during that day's window, regardless of current
    // status — reconstructing history uses the day's actual window.
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

      const yieldCentsByLevel = new Map<number, number>();
      let teamMemberCount = 0;
      const eligibleSources: { buyerId: string; level: number; yieldCents: number }[] = [];
      for (const [buyerId, { level, yieldCents }] of sourcesByAncestor.get(ancestorId)?.entries() ?? []) {
        if (level <= effectiveStar) {
          yieldCentsByLevel.set(level, (yieldCentsByLevel.get(level) ?? 0) + yieldCents);
          teamMemberCount++;
          eligibleSources.push({ buyerId, level, yieldCents });
        }
      }

      let correctBonusCents = 0;
      const perLevelMeta: { level: number; base: number; ratePct: number; bonus: number }[] = [];
      for (let level = 1; level <= effectiveStar; level++) {
        const levelBaseCents = yieldCentsByLevel.get(level) ?? 0;
        const ratePct = pcts[level - 1] ?? 0;
        const levelBonusCents = calcTeamEnergyBonusCents(levelBaseCents, bpFromPct(ratePct));
        correctBonusCents += levelBonusCents;
        perLevelMeta.push({ level, base: levelBaseCents / 100, ratePct, bonus: levelBonusCents / 100 });
      }
      const correctAmount = correctBonusCents / 100;
      const wrongAmount = row.amount;

      if (Math.abs(correctAmount - wrongAmount) < 0.005) {
        unchanged++;
        continue;
      }

      const uid = ancestorId;
      const avail = availByUser.get(uid) ?? 0;
      const reversalDeduct = Math.min(wrongAmount, avail);
      const reversalRounded = Math.round(reversalDeduct * 100) / 100;

      try {
        if (reversalRounded > 0) {
          await applyLedgerEntry({
            userId: uid,
            wallet: "bonus",
            field: "available",
            direction: "debit",
            amount: reversalRounded,
            type: "team_bonus",
            reference: { resource: "WalletTransaction", resourceId: `team-energy-flatrate-reversal:${row._id.toString()}` },
            memo: `Reversal — pre-fix proportional-split team energy credit (superseded by per-level table rates, cc17f94)`,
            meta: { reversalOf: "team-energy-flatrate-bug", originalTxId: row._id.toString(), date, correctionOf: row._id.toString() },
          });
          availByUser.set(uid, avail - reversalRounded);
        }
        const shortfall = Math.round((wrongAmount - reversalRounded) * 100) / 100;
        if (shortfall > 0.001) {
          uncollectible += shortfall;
          console.log(`  PARTIAL ${uid}: owed reversal ${wrongAmount.toFixed(2)}, available ${avail.toFixed(2)}, uncollectible ${shortfall.toFixed(2)}`);
        }

        if (correctAmount > 0) {
          const rateSummary = perLevelMeta.map((p) => `L${p.level} ${p.ratePct}%`).join(" + ");
          const sources = eligibleSources
            .map(({ buyerId, level, yieldCents }) => {
              const info = buyerInfoByUser.get(buyerId);
              return {
                fromUserId: buyerId,
                fromUserName: info?.name ?? null,
                fromReferralCode: info?.referralCode ?? null,
                level,
                // Full-precision per-source share — no per-source cent rounding
                // (see runDailyTeamEnergy's sources comment).
                amount: (yieldCents * bpFromPct(pcts[level - 1] ?? 0)) / 1_000_000,
              };
            })
            .sort((a, b) => a.level - b.level || b.amount - a.amount);

          await applyLedgerEntry({
            userId: uid,
            wallet: "bonus",
            field: "available",
            direction: "credit",
            amount: correctAmount,
            type: "team_bonus",
            reference: { resource: "WalletTransaction", resourceId: `team-energy-correction:${row._id.toString()}` },
            memo: `Corrected daily team energy bonus — ${effectiveStar} Star (${rateSummary})`,
            meta: {
              date,
              earningDate: date,
              bonusType: "DAILY_TEAM_ENERGY",
              starLevel: effectiveStar,
              starPosition: effectiveStar,
              teamMemberCount,
              bonusPercentage: row.meta?.bonusPercentage ?? null,
              perLevel: perLevelMeta,
              eligibleBonusBase: Array.from(yieldCentsByLevel.values()).reduce((s, v) => s + v, 0) / 100,
              bonusAmount: correctAmount,
              sources,
              status: "completed",
              correctionOf: row._id.toString(),
            },
          });
        }
        corrected++;
      } catch (err) {
        console.error(`  correction failed ${uid}:`, err instanceof Error ? err.message : err);
      }
    }
  }

  console.log(
    `\ndone. corrected=${corrected} unchanged=${unchanged} skippedNoStar=${skippedNoStar} uncollectible=$${uncollectible.toFixed(2)}`,
  );
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
