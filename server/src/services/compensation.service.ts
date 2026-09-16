import mongoose from "mongoose";
import { User, UserPackage, BonanzaOffer, ActivityLog, WalletTransaction } from "../models/index.js";
import { logger } from "../config/logger.js";
import { applyLedgerEntry } from "./wallet.service.js";
import { sendNotificationEmail } from "./email.service.js";
import { bonanzaEarnedTemplate } from "./emailTemplates.js";
import {
  getDirectBonusPct,
  isYieldEnabled,
  getMonthlyYieldCapPct,
  getYieldDailyMinPct,
  getYieldDailyMaxPct,
  getYieldCatchUpCapPct,
  isTeamEnergyEnabled,
  getTeamEnergyDepth,
  getTeamEnergyPct,
  isCommunityEnabled,
} from "./setting.service.js";
// Star qualification comes from the ONE centralized engine (user architecture
// rule) — both the daily Team Energy payout and the monthly Community payout
// consume `computeQualifiedStar`; neither re-implements qualification.
import {
  MAX_STAR,
  STAR_REQUIREMENTS,
  batchPerLevelActiveTeamCounts,
  computeQualifiedStar,
  monthlyBonusCentsForStar,
  perLevelActiveTeamCounts,
} from "./starQualification.service.js";
// The daily income math (percentage × base) is Team Energy's own payout model.
import { bpFromPct, calcTeamEnergyBonusCents } from "./teamEnergy.service.js";
// Shared pagination helpers (same clamp + meta block the report endpoints use).
import { clampPage, paginate } from "./report.service.js";
import type {
  YieldRunSummary,
  BonanzaEvalSummary,
  TeamEnergyRunSummary,
  CommunityRunSummary,
  CommunityBonusInfo,
  TeamEnergyLevelRow,
  AdminCommunityBonusReport,
  AdminCommunityBonusRow,
} from "@zeminex/shared";

const DAY_MS = 86_400_000;

/** Round to 2 decimal places (cents) — guards float drift. */
function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** UTC midnight bounds of the day containing `d`. */
export function utcDayBounds(d: Date): { start: number; end: number } {
  const start = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return { start, end: start + DAY_MS };
}

/** YYYY-MM-DD (UTC) for a timestamp. */
export function dayKey(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/* ------------------------------------------------------------------ */
/*  Flexible daily yield schedule (0.5–1% band → exact monthly target) */
/* ------------------------------------------------------------------ */

/**
 * Deterministic daily trade-performance factor in [0, 1] for a UTC day.
 * FNV-1a hash of the date key — stable across re-runs and backfills, and
 * identical for every package that day (one market-wide "trading day").
 * Skewed high (`1 − u^4`, mean ≈ 0.8) so most days sit near the top of the
 * daily band and dips toward the floor are occasional, like real trading.
 */
function dailyPerformanceFactor(dateKey: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < dateKey.length; i++) {
    h ^= dateKey.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  h = (h ^ (h >>> 15)) >>> 0;
  return 1 - ((h % 100000) / 100000) ** 4;
}

/**
 * Pro-rata eligible-days window of a package inside the UTC month starting at
 * `monthStartMs` (`daysInMonth` days). Returns how many days of the month the
 * package is yield-eligible on ([activatedAt, expiresAt) overlapping the day),
 * and how many of those remain counting today's index (0-based from month
 * start). Mid-month activations/expiries pro-rate the month's target by
 * `eligibleDays / daysInMonth`.
 */
function eligibleDaysWindow(
  activatedAtMs: number,
  expiresAtMs: number | null,
  monthStartMs: number,
  daysInMonth: number,
  todayIdx: number,
): { eligibleDays: number; eligibleDaysRemaining: number } {
  const monthEndMs = monthStartMs + daysInMonth * DAY_MS;
  const firstIdx = Math.max(0, Math.floor((Math.max(activatedAtMs, monthStartMs) - monthStartMs) / DAY_MS));
  const lastIdx =
    expiresAtMs === null
      ? daysInMonth - 1
      : Math.min(daysInMonth - 1, Math.ceil((Math.min(expiresAtMs, monthEndMs) - monthStartMs) / DAY_MS) - 1);
  if (lastIdx < firstIdx) return { eligibleDays: 0, eligibleDaysRemaining: 0 };
  const eligibleDays = lastIdx - firstIdx + 1;
  const eligibleDaysRemaining = todayIdx >= firstIdx && todayIdx <= lastIdx ? lastIdx - todayIdx + 1 : 0;
  return { eligibleDays, eligibleDaysRemaining };
}

/**
 * Scheduled trade-yield amount (USD) for one package-day under the flexible
 * model. The day's performance picks a base rate inside the `[dailyMinPct,
 * dailyMaxPct]` band; when the month's remaining target can no longer be
 * recovered within the band, the rate catches up to the pace (it may exceed
 * the band, bounded by `catchUpCapPct`); and the credit never overshoots what
 * is left of the (pro-rata) monthly target — so a fully-run month lands on the
 * target exactly. `proRataTargetAmount = 0` means no monthly target: the rate
 * just flexes inside the band.
 */
export function scheduledYieldAmount(args: {
  priceUsd: number;
  perfFactor: number;
  dailyMinPct: number;
  dailyMaxPct: number;
  catchUpCapPct: number;
  proRataTargetAmount: number;
  creditedSoFarAmount: number;
  eligibleDaysRemaining: number;
}): number {
  const { priceUsd, perfFactor, dailyMinPct, dailyMaxPct, catchUpCapPct, proRataTargetAmount, creditedSoFarAmount, eligibleDaysRemaining } = args;
  const minAmt = (priceUsd * dailyMinPct) / 100;
  const maxAmt = Math.max(minAmt, (priceUsd * dailyMaxPct) / 100);
  const catchUpAmt = Math.max(maxAmt, (priceUsd * catchUpCapPct) / 100);
  const base = minAmt + (maxAmt - minAmt) * perfFactor; // today's trade performance
  if (proRataTargetAmount <= 0) return round2(base);
  const remaining = round2(proRataTargetAmount - creditedSoFarAmount);
  if (eligibleDaysRemaining <= 0 || remaining <= 0) return 0;
  const need = remaining / eligibleDaysRemaining; // pace that lands exactly on target
  let rateAmt = base;
  if (need > maxAmt) rateAmt = Math.min(need, catchUpAmt); // band alone can't recover → catch up
  if (eligibleDaysRemaining === 1) rateAmt = Math.min(remaining, catchUpAmt); // last eligible day closes the month exactly
  return round2(Math.min(rateAmt, remaining));
}

/** Per-day inputs shared by the yield and team-energy runs, loaded once. */
export type YieldScheduleContext = {
  capPct: number;
  dailyMinPct: number;
  dailyMaxPct: number;
  catchUpCapPct: number;
  perfFactor: number;
  monthStartMs: number;
  daysInMonth: number;
  monthKey: string;
  /** Month-to-date credited `trading_yield` per package (USD), keyed by package id. */
  creditedByPkg: Map<string, number>;
};

/**
 * Load the yield-schedule knobs for the target day plus this month's
 * credited-yield totals per package (one aggregate). `excludeDayKey` drops the
 * target day's own credits from the totals — team energy uses it so its
 * estimate matches the amount the yield engine credits for that day
 * regardless of which run happens first.
 */
export async function loadYieldScheduleContext(
  target: Date,
  dayKeyStr: string,
  opts: { excludeDayKey?: boolean } = {},
): Promise<YieldScheduleContext> {
  const [dailyMinPct, dailyMaxPct, catchUpCapPct, capPct] = await Promise.all([
    getYieldDailyMinPct(),
    getYieldDailyMaxPct(),
    getYieldCatchUpCapPct(),
    getMonthlyYieldCapPct(),
  ]);
  const { start: monthStart, end: monthEnd, key: monthKey } = utcMonthBounds(target);
  const monthStartMs = monthStart.getTime();
  const daysInMonth = Math.round((monthEnd.getTime() - monthStartMs) / DAY_MS);

  const creditedByPkg = new Map<string, number>();
  if (capPct > 0) {
    const dateFilter = opts.excludeDayKey
      ? { $gte: `${monthKey}-01`, $lt: dayKeyStr }
      : { $regex: `^${monthKey}` };
    const monthAgg = (await WalletTransaction.aggregate([
      {
        $match: {
          type: "trading_yield",
          direction: "credit",
          "meta.date": dateFilter,
        },
      },
      { $group: { _id: "$meta.userPackageId", total: { $sum: "$amount" } } },
    ])) as { _id: string; total: number }[];
    for (const row of monthAgg) creditedByPkg.set(row._id, round2(row.total));
  }

  return {
    capPct,
    dailyMinPct,
    dailyMaxPct,
    catchUpCapPct,
    perfFactor: dailyPerformanceFactor(dayKeyStr),
    monthStartMs,
    daysInMonth,
    monthKey,
    creditedByPkg,
  };
}

/** Scheduled yield (USD) for one package on the target day, from a loaded context. */
export function scheduledYieldForPackage(
  ctx: YieldScheduleContext,
  up: LeanActivePackage,
  dayStartMs: number,
  activatedAtMs: number,
  expiresAtMs: number | null,
): number {
  const price = up.snapshot.priceUsd;
  const todayIdx = Math.floor((dayStartMs - ctx.monthStartMs) / DAY_MS);
  const { eligibleDays, eligibleDaysRemaining } = eligibleDaysWindow(
    activatedAtMs,
    expiresAtMs,
    ctx.monthStartMs,
    ctx.daysInMonth,
    todayIdx,
  );
  // Mid-month activations/expiries pro-rate the monthly target by eligible days.
  const proRataTargetAmount =
    ctx.capPct > 0 ? round2(((price * ctx.capPct) / 100) * (eligibleDays / ctx.daysInMonth)) : 0;
  return scheduledYieldAmount({
    priceUsd: price,
    perfFactor: ctx.perfFactor,
    dailyMinPct: ctx.dailyMinPct,
    dailyMaxPct: ctx.dailyMaxPct,
    catchUpCapPct: ctx.catchUpCapPct,
    proRataTargetAmount,
    creditedSoFarAmount: ctx.creditedByPkg.get(up._id.toString()) ?? 0,
    eligibleDaysRemaining,
  });
}

/* ------------------------------------------------------------------ */
/*  Direct Connect Bonus                                               */
/* ------------------------------------------------------------------ */

/**
 * Award the direct-connect bonus to the buyer's sponsor when a referral's
 * package activates. Idempotent via the deposit id reference. Best-effort:
 * callers wrap in `.catch` so a bonus failure never breaks deposit confirmation.
 *
 * Eligibility: the sponsor must hold an active UserPackage (prevents bonus
 * farming by inactive accounts). Blueprint-silent; defensible MLM default.
 */
export async function awardDirectBonus(
  buyerId: string,
  packagePriceUsd: number,
  depositId: string,
): Promise<void> {
  const buyer = await User.findById(buyerId).select("sponsorId name referralCode").lean();
  const sponsorId = buyer?.sponsorId;
  if (!sponsorId) return; // no sponsor — root user

  const sponsorIdStr = sponsorId.toString();
  const sponsorActive = await UserPackage.exists({ user: sponsorIdStr, status: "active" });
  if (!sponsorActive) {
    logger.info("Direct bonus skipped — sponsor has no active package", { buyerId, sponsorId: sponsorIdStr });
    return;
  }

  const pct = await getDirectBonusPct();
  const amount = round2((packagePriceUsd * pct) / 100);
  if (amount <= 0) return;

  await applyLedgerEntry({
    userId: sponsorIdStr,
    wallet: "bonus",
    field: "available",
    direction: "credit",
    amount,
    type: "direct_bonus",
    reference: { resource: "Deposit", resourceId: `direct-bonus:${depositId}` },
    memo: `Direct connect bonus — ${pct}% of package activation — from ${buyer?.name ?? "downline"} (L1)`,
    meta: {
      buyerId,
      depositId,
      pct,
      level: 1,
      fromUserId: buyerId,
      fromUserName: buyer?.name ?? null,
      fromReferralCode: buyer?.referralCode ?? null,
    },
  });

  await ActivityLog.create({
    actor: sponsorIdStr,
    action: "compensation.direct_bonus",
    resource: "Deposit",
    resourceId: depositId,
    meta: { buyerId, amount, pct },
  }).catch(() => undefined);
}

/* ------------------------------------------------------------------ */
/*  Daily Trade Yield                                                  */
/* ------------------------------------------------------------------ */

export type LeanActivePackage = {
  _id: { toString(): string };
  user: { toString(): string };
  snapshot: { name: string; priceUsd: number; dailyReturnPct: number; durationDays: number };
  activatedAt: Date | null;
  expiresAt: Date | null;
};

/**
 * Run the daily trade-yield credit for every active, in-window UserPackage.
 * Idempotent per package per UTC day via the `yield:<pkgId>:<date>` reference,
 * so re-running the same day (or backfilling) is safe. Packages whose
 * `expiresAt` has passed are flipped `active → expired` in the same run.
 *
 * The daily amount follows the flexible schedule (`scheduledYieldAmount`): the
 * day's deterministic performance factor picks a base rate inside the admin
 * `[yieldDailyMinPct, yieldDailyMaxPct]` band, catch-up rates restore the pace
 * when the band can't reach the monthly target, and the month lands on
 * `monthlyYieldCapPct`% of the package price exactly (pro-rated for packages
 * activated/expiring mid-month).
 *
 * Triggered by the daily 00:30 UTC cron job and the admin
 * `POST /compensation/run-yield` endpoint. `asOf` targets a specific UTC day
 * for backfills; defaults to today.
 */
export async function runDailyYield(asOf?: Date): Promise<YieldRunSummary> {
  const now = new Date();
  const target = asOf ?? now;
  const { start, end } = utcDayBounds(target);
  const key = dayKey(start);

  if (!(await isYieldEnabled())) {
    return { asOf: target.toISOString(), processed: 0, credited: 0, skipped: 0, expired: 0, errors: 0 };
  }

  const packages = (await UserPackage.find({ status: "active" }).lean()) as LeanActivePackage[];
  let credited = 0;
  let skipped = 0;
  let expired = 0;
  let errors = 0;

  // Schedule knobs + this month's credited totals per package. The totals are
  // scoped by the yield's for-day (`meta.date` = YYYY-MM-DD), not `createdAt`,
  // so backfills to a past month are bounded by that month's target even
  // though the ledger row is written "now".
  const ctx = await loadYieldScheduleContext(target, key);

  for (const up of packages) {
    try {
      const activatedAt = up.activatedAt instanceof Date ? up.activatedAt.getTime() : null;
      const expiresAt = up.expiresAt instanceof Date ? up.expiresAt.getTime() : null;
      if (activatedAt == null) {
        skipped++;
        continue;
      }
      // Eligible when the active interval [activatedAt, expiresAt) overlaps day D.
      // expiresAt === null means LIFETIME (eligible indefinitely once activated).
      const overlaps = activatedAt < end && (expiresAt === null || expiresAt > start);
      if (!overlaps) {
        skipped++;
      } else {
        const s = up.snapshot;
        const amount = scheduledYieldForPackage(ctx, up, start, activatedAt, expiresAt);
        if (amount > 0) {
          const ratePct = s.priceUsd > 0 ? round2((amount / s.priceUsd) * 100) : 0;
          await applyLedgerEntry({
            userId: up.user.toString(),
            wallet: "trading",
            field: "available",
            direction: "credit",
            amount,
            type: "trading_yield",
            reference: { resource: "UserPackage", resourceId: `yield:${up._id.toString()}:${key}` },
            memo: `Daily trade yield — ${s.name} @ ${ratePct.toFixed(2)}%/day`,
            meta: { userPackageId: up._id.toString(), date: key, ratePct },
          });
          // Track the credited amount against this package's monthly running total.
          if (ctx.capPct > 0) {
            ctx.creditedByPkg.set(
              up._id.toString(),
              round2((ctx.creditedByPkg.get(up._id.toString()) ?? 0) + amount),
            );
          }
          credited++;
        } else {
          skipped++;
        }
      }

      // Expiry sweep: a package past its term is no longer yield-eligible.
      // Lifetime packages (expiresAt === null) never expire.
      if (expiresAt !== null && expiresAt <= now.getTime()) {
        const res = await UserPackage.updateOne({ _id: up._id, status: "active" }, { $set: { status: "expired" } });
        if (res.modifiedCount > 0) expired++;
      }
    } catch (err) {
      errors++;
      logger.error("Yield credit failed", {
        userPackageId: up._id.toString(),
        date: key,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return {
    asOf: target.toISOString(),
    processed: packages.length,
    credited,
    skipped,
    expired,
    errors,
  };
}

/* ------------------------------------------------------------------ */
/*  Daily Team Energy Bonus                                            */
/* ------------------------------------------------------------------ */

export type LeanLineageUser = {
  _id: { toString(): string };
  lineage: { toString(): string }[];
  name: string;
  referralCode: string;
};

/**
 * Run the daily team-energy credit (star-qualified model — teamEnergy.service.ts):
 * an ancestor qualifies for Star N by having ≥ 3^N ACTIVE members at lineage
 * level N (evaluated sequentially), and earns PER-LEVEL table rates within
 * their star's depth: level L pays `pct[L]`% of level L's scheduled daily
 * trade-yield volume, stacked across levels 1..star (a 2★ earns L1 at the L1
 * rate AND L2 at the L2 rate), as ONE `team_bonus` credit per earning day —
 * idempotent via `team-energy:<userId>:<date>`. The star is recomputed from
 * the authoritative DB per-level counts on every run and persisted
 * (`User.teamEnergyStar`).
 *
 * Eligibility (anti-farming): an ancestor only earns if they hold an active
 * UserPackage. Users already credited for the same day under the legacy
 * per-ancestor key format are skipped (deploy-day double-pay guard). Triggered
 * daily by the `daily_team_energy` cron and by the admin
 * `POST /compensation/run-team-energy` endpoint. `asOf` targets a specific UTC
 * day for backfills; defaults to today.
 */
export async function runDailyTeamEnergy(asOf?: Date): Promise<TeamEnergyRunSummary> {
  const target = asOf ?? new Date();
  const { start, end } = utcDayBounds(target);
  const key = dayKey(start);

  if (!(await isTeamEnergyEnabled())) {
    return { asOf: target.toISOString(), processed: 0, credited: 0, skipped: 0, errors: 0 };
  }

  // `depth` = maximum payable star (0 disables payouts); `pcts[star−1]` = the
  // star's daily bonus percentage (teamEnergy.service.ts table semantics).
  const depth = await getTeamEnergyDepth();
  const pcts = await getTeamEnergyPct();
  if (depth <= 0 || !pcts.some((p) => p > 0)) {
    return { asOf: target.toISOString(), processed: 0, credited: 0, skipped: 0, errors: 0 };
  }

  // Active, in-window packages (same eligibility filter as the yield run).
  const packages = (await UserPackage.find({ status: "active" }).lean()) as LeanActivePackage[];
  if (packages.length === 0) {
    return { asOf: target.toISOString(), processed: 0, credited: 0, skipped: 0, errors: 0 };
  }

  // The day's scheduled trade yield (same flexible schedule the yield engine
  // pays) — upstream bonuses track actual yield, not the legacy per-package
  // snapshot rate. Today's own credits are excluded so this estimate matches
  // the yield credit for the day regardless of which run happens first.
  const yieldCtx = await loadYieldScheduleContext(target, key, { excludeDayKey: true });

  // Fetch each buyer's lineage + name/referralCode once (map by user id) — the
  // name/code are denormalised onto each credit so reports can show "earned
  // from <name> (<code>) at level N" without an extra join.
  const buyerIds = Array.from(new Set(packages.map((p) => p.user.toString())));
  const lineageUsers = (await User.find({ _id: { $in: buyerIds } })
    .select("lineage name referralCode")
    .lean()) as LeanLineageUser[];
  const lineageByUser = new Map<string, string[]>();
  const buyerInfoByUser = new Map<string, { name: string; referralCode: string }>();
  for (const u of lineageUsers) {
    lineageByUser.set(u._id.toString(), (u.lineage ?? []).map((a) => a.toString()));
    buyerInfoByUser.set(u._id.toString(), { name: u.name, referralCode: u.referralCode });
  }

  // Cache the set of users holding an active package so the per-ancestor guard
  // is one set lookup instead of N `exists` calls.
  const activeUserIds = new Set(
    (await UserPackage.find({ status: "active" }).distinct("user")).map((id) => id.toString()),
  );
  const isActiveSponsor = (id: string): boolean => activeUserIds.has(id);

  // Accumulate the day's eligible base per ancestor, broken down by the
  // downline source user (and their level): the base is the scheduled daily
  // trade yield of downline packages within the ancestor's star depth.
  // Ancestors of every in-window package are recorded even when the yield is 0
  // so the star projection still reflects the live team structure.
  const ancestors = new Set<string>();
  const sourcesByAncestor = new Map<string, Map<string, { level: number; yieldCents: number }>>();

  let skipped = 0;
  for (const up of packages) {
    try {
      const activatedAt = up.activatedAt instanceof Date ? up.activatedAt.getTime() : null;
      const expiresAt = up.expiresAt instanceof Date ? up.expiresAt.getTime() : null;
      if (activatedAt == null) {
        skipped++;
        continue;
      }
      // expiresAt === null means LIFETIME (eligible indefinitely once activated).
      if (!(activatedAt < end && (expiresAt === null || expiresAt > start))) {
        skipped++;
        continue;
      }
      const yieldAmt = scheduledYieldForPackage(yieldCtx, up, start, activatedAt, expiresAt);

      // Walk the buyer's lineage from the closest ancestor (direct sponsor =
      // lineage[last]) up to the star-table ceiling. Level L = lineage[len − L].
      const lineage = lineageByUser.get(up.user.toString()) ?? [];
      for (let level = 1; level <= MAX_STAR; level++) {
        const ancestorId = lineage[lineage.length - level];
        if (!ancestorId) break;
        ancestors.add(ancestorId);
        if (yieldAmt <= 0) continue;
        let sources = sourcesByAncestor.get(ancestorId);
        if (!sources) {
          sources = new Map();
          sourcesByAncestor.set(ancestorId, sources);
        }
        // A buyer's multiple packages accumulate into one source entry.
        const prev = sources.get(up.user.toString());
        sources.set(up.user.toString(), {
          level,
          yieldCents: (prev?.yieldCents ?? 0) + Math.round(yieldAmt * 100),
        });
      }
    } catch (err) {
      logger.error("Team energy accrual failed for package", {
        userPackageId: up._id.toString(),
        date: key,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // Per-level ACTIVE member counts for every ancestor — one batch aggregation
  // instead of N (Star Qualification Engine). The star is recomputed from these
  // authoritative counts on every run, never from a cache.
  const maxDepth = Math.min(depth, MAX_STAR);
  const countsByAncestor = await batchPerLevelActiveTeamCounts(Array.from(ancestors), maxDepth);

  // Deploy-day guard: users already credited for this earning day under the
  // legacy per-ancestor key format (rows carrying no meta.bonusType) are
  // skipped — the new idempotency key cannot collide with the old one.
  const legacyPaid = new Set(
    (
      await WalletTransaction.aggregate<{ _id: { toString(): string } }>([
        {
          $match: {
            type: "team_bonus",
            direction: "credit",
            "meta.date": key,
            "meta.bonusType": { $ne: "DAILY_TEAM_ENERGY" },
          },
        },
        { $group: { _id: "$user" } },
      ])
    ).map((r) => r._id.toString()),
  );

  let credited = 0;
  let errors = 0;
  for (const ancestorId of ancestors) {
    const star = computeQualifiedStar(countsByAncestor.get(ancestorId) ?? new Map());
    // Persist the projection (read model only — never a payout input).
    await User.updateOne({ _id: ancestorId }, { $set: { teamEnergyStar: star } }).catch(() => undefined);
    const effectiveStar = Math.min(star, depth);
    if (effectiveStar < 1 || !isActiveSponsor(ancestorId) || legacyPaid.has(ancestorId)) {
      skipped++;
      continue;
    }
    const pct = pcts[effectiveStar - 1] ?? 0;
    // One credit per user per earning day: `applyLedgerEntry` dedupes
    // (user, type, reference.resourceId) silently, so pre-check here to report
    // the re-run as "skipped", not "credited".
    const dupKey = `team-energy:${ancestorId}:${key}`;
    if (await WalletTransaction.exists({ user: ancestorId, type: "team_bonus", "reference.resourceId": dupKey })) {
      skipped++;
      continue;
    }
    // Eligible base = the scheduled yield of downline sources within the
    // star's depth; integer cents throughout (no float percentage math).
    // Each level pays its OWN table rate: level L earns pcts[L−1]% of level
    // L's yield, stacking across levels 1..effectiveStar (a 2★ earns L1 at
    // the L1 rate AND L2 at the L2 rate) — never one star-wide rate split
    // proportionally across levels.
    let baseCents = 0;
    let teamMemberCount = 0;
    const eligibleSources: { buyerId: string; level: number; yieldCents: number }[] = [];
    const yieldCentsByLevel = new Map<number, number>();
    for (const [buyerId, { level, yieldCents }] of sourcesByAncestor.get(ancestorId)?.entries() ?? []) {
      if (level <= effectiveStar) {
        baseCents += yieldCents;
        teamMemberCount++;
        yieldCentsByLevel.set(level, (yieldCentsByLevel.get(level) ?? 0) + yieldCents);
        eligibleSources.push({ buyerId, level, yieldCents });
      }
    }
    // Per-level bonus in integer cents (level base × level rate, nearest-cent
    // rounded); the day's credit is the sum across levels.
    let bonusCents = 0;
    const perLevelMeta: { level: number; base: number; ratePct: number; bonus: number }[] = [];
    for (let level = 1; level <= effectiveStar; level++) {
      const levelBaseCents = yieldCentsByLevel.get(level) ?? 0;
      const ratePct = pcts[level - 1] ?? 0;
      const levelBonusCents = calcTeamEnergyBonusCents(levelBaseCents, bpFromPct(ratePct));
      bonusCents += levelBonusCents;
      perLevelMeta.push({ level, base: levelBaseCents / 100, ratePct, bonus: levelBonusCents / 100 });
    }
    if (bonusCents <= 0) {
      skipped++;
      continue;
    }
    const amount = bonusCents / 100;
    const rateSummary = perLevelMeta.map((p) => `L${p.level} ${p.ratePct}%`).join(" + ");
    // Per-contributor breakdown for the report drill-down: each source's
    // EXACT per-level share (its yield × its level's rate, rounded to cents) —
    // no proportional split of the aggregate. Summed source amounts may drift
    // a cent from `amount` due to per-source rounding, fine for display.
    const sources = eligibleSources
      .map(({ buyerId, level, yieldCents }) => {
        const info = buyerInfoByUser.get(buyerId);
        return {
          fromUserId: buyerId,
          fromUserName: info?.name ?? null,
          fromReferralCode: info?.referralCode ?? null,
          level,
          amount: calcTeamEnergyBonusCents(yieldCents, bpFromPct(pcts[level - 1] ?? 0)) / 100,
        };
      })
      .sort((a, b) => a.level - b.level || b.amount - a.amount);
    try {
      await applyLedgerEntry({
        userId: ancestorId,
        wallet: "bonus",
        field: "available",
        direction: "credit",
        amount,
        type: "team_bonus",
        reference: { resource: "User", resourceId: `team-energy:${ancestorId}:${key}` },
        memo: `Daily team energy bonus — ${effectiveStar} Star (${rateSummary})`,
        meta: {
          date: key,
          earningDate: key,
          bonusType: "DAILY_TEAM_ENERGY",
          starLevel: effectiveStar,
          starPosition: effectiveStar,
          teamMemberCount,
          bonusPercentage: pct,
          perLevel: perLevelMeta,
          eligibleBonusBase: baseCents / 100,
          bonusAmount: amount,
          sources,
          status: "completed",
        },
      });
      credited++;
      await ActivityLog.create({
        actor: ancestorId,
        action: "compensation.team_bonus",
        resource: "User",
        resourceId: `team-energy:${ancestorId}:${key}`,
        meta: {
          amount,
          date: key,
          bonusType: "DAILY_TEAM_ENERGY",
          starLevel: effectiveStar,
          teamMemberCount,
          bonusPercentage: pct,
        },
      }).catch(() => undefined);
    } catch (err) {
      errors++;
      logger.error("Team energy credit failed", {
        ancestorId,
        date: key,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return {
    asOf: target.toISOString(),
    processed: packages.length,
    credited,
    skipped,
    errors,
  };
}

/* ------------------------------------------------------------------ */
/*  Community Monthly Bonus                                            */
/* ------------------------------------------------------------------ */

/** UTC bounds + `YYYY-MM` key for the month containing `d`. */
function utcMonthBounds(d: Date): { start: Date; end: Date; key: string } {
  const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
  const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
  const key = start.toISOString().slice(0, 7);
  return { start, end, key };
}

/**
 * Run the monthly community credit: each active-package holder earns the FIXED
 * monthly $ amount for their highest sequentially qualified star (Community
 * Monthly Bonus spec) — paid ONCE per distribution month, on the 10th.
 *
 * Star qualification is the SAME centralized engine the Daily Team Energy
 * bonus uses (starQualification.service.ts): 3^N ACTIVE members at lineage
 * level N, evaluated sequentially — a deep downline can never bypass an
 * incomplete level 1. The payout itself is fully independent of Team Energy:
 * a fixed dollar amount from `STAR_MONTHLY_BONUS_USD` (never a percentage,
 * never derived from any Team Energy amount), with its own transaction type
 * (`community_bonus`), schedule and duplicate-payment protection.
 *
 * One `community_bonus` credit per user per month, idempotent via
 * `community:<userId>:<YYYY-MM>`. Because the star is recomputed from the live
 * DB at distribution time, a team that shrank earns its CURRENT star's amount
 * — the ledger row preserves the star and amount actually paid.
 *
 * Eligibility (anti-farming): a user only earns while holding an active
 * UserPackage. Scheduled by the in-process cron on UTC day 10 (Phase 18) and
 * triggerable on demand via the admin `POST /compensation/run-community`
 * endpoint. `asOf` targets a specific month for backfills; defaults to the
 * current month.
 */
export async function runMonthlyCommunityBonus(asOf?: Date): Promise<CommunityRunSummary> {
  const target = asOf ?? new Date();
  const { key: monthKey } = utcMonthBounds(target);
  const distributionDate = target.toISOString();

  if (!(await isCommunityEnabled())) {
    return { month: monthKey, processed: 0, credited: 0, skipped: 0, errors: 0 };
  }

  // Active-package holders only (anti-farming guard).
  const activeUserIds = (await UserPackage.find({ status: "active" }).distinct("user")).map((id) =>
    id.toString(),
  );
  if (activeUserIds.length === 0) {
    return { month: monthKey, processed: 0, credited: 0, skipped: 0, errors: 0 };
  }

  // Star Qualification Engine: per-level ACTIVE member counts for every
  // candidate in one batch aggregation, then the sequential walk. Never a
  // total team size, never the sticky rank star.
  const countsByUser = await batchPerLevelActiveTeamCounts(activeUserIds, MAX_STAR);

  let credited = 0;
  let skipped = 0;
  let errors = 0;

  for (const userId of activeUserIds) {
    try {
      const star = computeQualifiedStar(countsByUser.get(userId) ?? new Map());
      if (star < 1) {
        skipped++;
        continue;
      }
      // Duplicate-payment protection (spec §7): one payout per user per
      // distribution month. `applyLedgerEntry` dedupes silently on re-runs,
      // so pre-check here to report them as "skipped", not "credited".
      const refKey = `community:${userId}:${monthKey}`;
      if (
        await WalletTransaction.exists({
          user: userId,
          type: "community_bonus",
          "reference.resourceId": refKey,
        })
      ) {
        skipped++;
        continue;
      }
      const qualifyingTeamMembers = countsByUser.get(userId)?.get(star) ?? 0;
      const requiredTeamMembers = STAR_REQUIREMENTS[star];
      // Fixed dollar amount from the centralized table, integer cents —
      // NOT a percentage of trading income, deposits, packages or volume.
      const bonusCents = monthlyBonusCentsForStar(star);
      if (bonusCents <= 0) {
        skipped++;
        continue;
      }
      const amount = bonusCents / 100;

      await applyLedgerEntry({
        userId,
        wallet: "bonus",
        field: "available",
        direction: "credit",
        amount,
        type: "community_bonus",
        reference: { resource: "User", resourceId: refKey },
        memo: `Community monthly bonus — ${star} Star`,
        meta: {
          month: monthKey, // legacy alias (kept for older report queries)
          distributionMonth: monthKey,
          distributionDate,
          bonusType: "COMMUNITY_MONTHLY_BONUS",
          starLevel: star,
          starPosition: star,
          qualifyingTeamMembers,
          requiredTeamMembers,
          bonusAmount: amount,
          currency: "USDT",
          status: "completed",
        },
      });
      credited++;
      await ActivityLog.create({
        actor: userId,
        action: "compensation.community_bonus",
        resource: "User",
        resourceId: refKey,
        meta: {
          amount,
          month: monthKey,
          distributionMonth: monthKey,
          bonusType: "COMMUNITY_MONTHLY_BONUS",
          starLevel: star,
          qualifyingTeamMembers,
          requiredTeamMembers,
        },
      }).catch(() => undefined);
    } catch (err) {
      errors++;
      logger.error("Community bonus credit failed", {
        userId,
        month: monthKey,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return {
    month: monthKey,
    processed: activeUserIds.length,
    credited,
    skipped,
    errors,
  };
}

/* ------------------------------------------------------------------ */
/*  Community Monthly Bonus — read models                              */
/* ------------------------------------------------------------------ */

/**
 * Read model for the Community Monthly Bonus dashboard card + the
 * `GET /dashboard/community` endpoint. The star is recomputed live from the
 * authoritative DB via the shared engine (never the persisted field, never
 * the client); the monthly amount comes from the engine's fixed table.
 */
export async function getCommunityMonthlyInfo(userId: string): Promise<CommunityBonusInfo> {
  const userOid = new mongoose.Types.ObjectId(userId);
  const [counts, historyDocs, totalAgg] = await Promise.all([
    perLevelActiveTeamCounts(userId, MAX_STAR),
    WalletTransaction.find({ user: userOid, type: "community_bonus", direction: "credit" })
      .sort({ createdAt: -1 })
      .limit(6)
      .select("amount meta createdAt")
      .lean(),
    WalletTransaction.aggregate<{ total: number }>([
      { $match: { user: userOid, type: "community_bonus", direction: "credit" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
  ]);

  const star = computeQualifiedStar(counts);

  const perLevel: TeamEnergyLevelRow[] = [];
  for (let level = 1; level <= MAX_STAR; level++) {
    const required = STAR_REQUIREMENTS[level];
    const activeCount = counts.get(level) ?? 0;
    perLevel.push({ level, activeCount, required, qualified: activeCount >= required });
  }

  let nextStar: CommunityBonusInfo["nextStar"] = null;
  if (star < MAX_STAR) {
    const nextLevel = star + 1;
    const required = STAR_REQUIREMENTS[nextLevel];
    const current = counts.get(nextLevel) ?? 0;
    nextStar = { level: nextLevel, required, current, gap: Math.max(0, required - current) };
  }

  const history = historyDocs.map((d) => ({
    id: d._id.toString(),
    month: (d.meta?.distributionMonth ?? d.meta?.month ?? "") as string,
    amount: d.amount,
    createdAt: d.createdAt.toISOString(),
  }));
  const newest = historyDocs[0];
  const lastDistribution = newest
    ? {
        month: (newest.meta?.distributionMonth ?? newest.meta?.month ?? "") as string,
        amount: newest.amount,
        date: newest.createdAt.toISOString(),
      }
    : null;

  return {
    starLevel: star,
    starPosition: star,
    qualifyingTeamMembers: star > 0 ? counts.get(star) ?? 0 : 0,
    requiredTeamMembers: star > 0 ? STAR_REQUIREMENTS[star] : 0,
    // Fixed monthly $ amount for the star (integer cents ÷ 100).
    monthlyBonus: monthlyBonusCentsForStar(star) / 100,
    perLevel,
    nextStar,
    lastDistribution,
    totalBonus: Math.round((totalAgg[0]?.total ?? 0) * 100) / 100,
    history,
  };
}

/**
 * Admin view of one distribution month's Community payouts (spec §12): every
 * `community_bonus` ledger row for the month, enriched with the earner's
 * name/email and carrying the star + amounts preserved on the transaction
 * (never re-derived from the user's current star), plus the month total.
 * `meta.distributionMonth` is the primary match; `meta.month` covers rows
 * written before that field existed.
 */
export async function getAdminCommunityBonusReport(
  month?: string,
  page = 1,
  limit = 20,
): Promise<AdminCommunityBonusReport> {
  const key = month ?? new Date().toISOString().slice(0, 7);
  const { page: p, limit: l } = clampPage(page, limit);
  const filter = {
    type: "community_bonus",
    direction: "credit",
    $or: [{ "meta.distributionMonth": key }, { "meta.month": key }],
  };

  // Page rows, total row count, and the whole-month summary come from three
  // independent queries — `total`/`credited` must cover every payout of the
  // month, not just the rendered page.
  const [rows, total, sums] = await Promise.all([
    WalletTransaction.find(filter)
      .sort({ createdAt: -1 })
      .skip((p - 1) * l)
      .limit(l)
      .lean(),
    WalletTransaction.countDocuments(filter),
    WalletTransaction.aggregate<{ _id: null; sum: number; credited: number }>([
      { $match: filter },
      { $group: { _id: null, sum: { $sum: "$amount" }, credited: { $sum: 1 } } },
    ]),
  ]);

  const userIds = Array.from(new Set(rows.map((r) => r.user.toString())));
  const users = userIds.length
    ? await User.find({ _id: { $in: userIds } }).select("name email").lean()
    : [];
  const userById = new Map(users.map((u) => [u._id.toString(), { name: u.name, email: u.email }]));

  const mapped: AdminCommunityBonusRow[] = rows.map((r) => ({
    id: r._id.toString(),
    userId: r.user.toString(),
    userName: userById.get(r.user.toString())?.name ?? "—",
    userEmail: userById.get(r.user.toString())?.email ?? "—",
    starLevel: ((r.meta?.starLevel ?? r.meta?.star ?? 0) as number) ?? 0,
    qualifyingTeamMembers: (r.meta?.qualifyingTeamMembers ?? null) as number | null,
    requiredTeamMembers: (r.meta?.requiredTeamMembers ?? null) as number | null,
    bonusAmount: r.amount,
    distributionMonth: (r.meta?.distributionMonth ?? r.meta?.month ?? key) as string,
    status: (r.meta?.status ?? "completed") as string,
    paymentDate: r.createdAt.toISOString(),
  }));

  return {
    month: key,
    rows: mapped,
    pagination: paginate(total, p, l),
    total: Math.round((sums[0]?.sum ?? 0) * 100) / 100,
    credited: sums[0]?.credited ?? 0,
  };
}

/* ------------------------------------------------------------------ */
/*  Bonanza evaluation                                                 */
/* ------------------------------------------------------------------ */

type LeanOffer = {
  _id: { toString(): string };
  name: string;
  requiredDirects: number;
  rewardAmount: number;
  startDate: Date;
  endDate: Date;
};

/** Active offers whose window contains `now`. */
async function activeOffersNow(now = new Date()): Promise<LeanOffer[]> {
  return BonanzaOffer.find({ status: "active", startDate: { $lte: now }, endDate: { $gte: now } }).lean();
}

/**
 * Evaluate bonanza offers for a single user: for each active offer whose
 * `requiredDirects` the user's direct count meets, credit the reward to the
 * bonus wallet. Idempotent via `bonanza:<offerId>:<userId>` — re-evaluation
 * never double-awards. Returns the number of new awards and errors.
 */
export async function evaluateBonanzasForUser(userId: string): Promise<{ awarded: number; errors: number }> {
  const offers = await activeOffersNow();
  if (offers.length === 0) return { awarded: 0, errors: 0 };

  // Anti-farming: only active-package holders earn bonanzas — the same guard
  // the direct, community, and rank rewards apply. Without it, a
  // non-package-holding upline member (e.g. the root admin) could claim a
  // bonanza purely on direct count.
  const activePkg = await UserPackage.exists({ user: userId, status: "active" });
  if (!activePkg) return { awarded: 0, errors: 0 };

  // Fetched once so each new award can fire a notification email without an
  // extra query per offer in the loop.
  const user = await User.findById(userId).lean();
  let awarded = 0;
  let errors = 0;

  for (const offer of offers) {
    // Only directs referred within this offer's own window count — a direct
    // made before startDate or after endDate must not qualify a user, even
    // though the offer itself is currently active.
    const directCount = await User.countDocuments({
      sponsorId: userId,
      createdAt: { $gte: offer.startDate, $lte: offer.endDate },
    });
    if (directCount < offer.requiredDirects) continue;
    const offerId = offer._id.toString();
    // Skip already-awarded offers (idempotent) — also keeps `awarded` honest.
    if (await isBonanzaAwarded(offerId, userId)) continue;
    try {
      await applyLedgerEntry({
        userId,
        wallet: "bonus",
        field: "available",
        direction: "credit",
        amount: offer.rewardAmount,
        type: "bonanza",
        reference: { resource: "BonanzaOffer", resourceId: `bonanza:${offerId}:${userId}` },
        memo: `Bonanza reward — ${offer.name}`,
        meta: { offerId, requiredDirects: offer.requiredDirects, directCount },
      });
      awarded++;
      await ActivityLog.create({
        actor: userId,
        action: "compensation.bonanza",
        resource: "BonanzaOffer",
        resourceId: offerId,
        meta: { name: offer.name, amount: offer.rewardAmount, directCount },
      }).catch(() => undefined);
      // Fire-and-forget: bulk "run for all" would otherwise serialize SMTP sends.
      if (user) {
        void sendNotificationEmail(
          user,
          bonanzaEarnedTemplate({ name: user.name, offerName: offer.name, rewardAmount: offer.rewardAmount }),
        );
      }
    } catch (err) {
      errors++;
      logger.error("Bonanza award failed", {
        userId,
        offerId: offer._id.toString(),
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return { awarded, errors };
}

/**
 * Evaluate bonanzas for every sponsor in the system (admin trigger). Sponsors
 * are the only users who can accumulate directs, so they are the only
 * candidates. Aggregates per-user results into a single summary.
 */
export async function runBonanzaEvaluationAll(): Promise<BonanzaEvalSummary> {
  const sponsorIds = await User.distinct("sponsorId", { sponsorId: { $ne: null } });
  let awarded = 0;
  let errors = 0;

  for (const id of sponsorIds) {
    const r = await evaluateBonanzasForUser(id.toString());
    awarded += r.awarded;
    errors += r.errors;
  }

  return { evaluated: sponsorIds.length, awarded, errors };
}

/* ------------------------------------------------------------------ */
/*  Awarded lookup (shared with bonanza.service overview)              */
/* ------------------------------------------------------------------ */

/** Has `userId` already been awarded offer `offerId`? (ledger row exists) */
export async function isBonanzaAwarded(offerId: string, userId: string): Promise<boolean> {
  const doc = await WalletTransaction.exists({
    user: userId,
    type: "bonanza",
    "reference.resourceId": `bonanza:${offerId}:${userId}`,
  });
  return Boolean(doc);
}