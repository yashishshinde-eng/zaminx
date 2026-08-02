import { User, UserPackage, BonanzaOffer, ActivityLog, WalletTransaction } from "../models/index.js";
import { logger } from "../config/logger.js";
import { applyLedgerEntry } from "./wallet.service.js";
import {
  getDirectBonusPct,
  isYieldEnabled,
  isTeamEnergyEnabled,
  getTeamEnergyDepth,
  getTeamEnergyPct,
  isCommunityEnabled,
  getCommunityPct,
} from "./setting.service.js";
import type {
  YieldRunSummary,
  BonanzaEvalSummary,
  TeamEnergyRunSummary,
  CommunityRunSummary,
} from "@zaminex/shared";

const DAY_MS = 86_400_000;

/** Round to 2 decimal places (cents) — guards float drift. */
function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** UTC midnight bounds of the day containing `d`. */
function utcDayBounds(d: Date): { start: number; end: number } {
  const start = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return { start, end: start + DAY_MS };
}

/** YYYY-MM-DD (UTC) for a timestamp. */
function dayKey(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
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
  const buyer = await User.findById(buyerId).select("sponsorId").lean();
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
    memo: `Direct connect bonus — ${pct}% of package activation`,
    meta: { buyerId, depositId, pct },
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

type LeanActivePackage = {
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
 * No cron yet (Phase 18) — triggered by the admin `POST /compensation/run-yield`
 * endpoint. `asOf` targets a specific UTC day for backfills; defaults to today.
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

  for (const up of packages) {
    try {
      const activatedAt = up.activatedAt instanceof Date ? up.activatedAt.getTime() : null;
      const expiresAt = up.expiresAt instanceof Date ? up.expiresAt.getTime() : null;
      if (activatedAt == null || expiresAt == null) {
        skipped++;
        continue;
      }
      // Eligible when the active interval [activatedAt, expiresAt) overlaps day D.
      const overlaps = activatedAt < end && expiresAt > start;
      if (!overlaps) {
        skipped++;
      } else {
        const s = up.snapshot;
        const amount = round2((s.priceUsd * s.dailyReturnPct) / 100);
        if (amount > 0) {
          await applyLedgerEntry({
            userId: up.user.toString(),
            wallet: "trading",
            field: "available",
            direction: "credit",
            amount,
            type: "trading_yield",
            reference: { resource: "UserPackage", resourceId: `yield:${up._id.toString()}:${key}` },
            memo: `Daily trade yield — ${s.name} (${s.dailyReturnPct}%)`,
            meta: { userPackageId: up._id.toString(), date: key },
          });
          credited++;
        } else {
          skipped++;
        }
      }

      // Expiry sweep: a package past its term is no longer yield-eligible.
      if (expiresAt <= now.getTime()) {
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

type LeanLineageUser = {
  _id: { toString(): string };
  lineage: { toString(): string }[];
};

/**
 * Run the daily team-energy credit: each active, in-window UserPackage
 * generates a daily yield, and a configurable slice of that yield flows up the
 * buyer's `lineage` to each ancestor (weighted by level, up to `depth`). One
 * `team_bonus` credit per ancestor per day, idempotent via
 * `team-energy:<ancestorId>:<date>`.
 *
 * Eligibility (anti-farming): an ancestor only earns if they hold an active
 * UserPackage. No cron yet (Phase 18) — triggered by the admin
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

  const depth = await getTeamEnergyDepth();
  const weights = await getTeamEnergyPct();
  if (depth <= 0 || weights.length === 0) {
    return { asOf: target.toISOString(), processed: 0, credited: 0, skipped: 0, errors: 0 };
  }

  // Active, in-window packages (same eligibility filter as the yield run).
  const packages = (await UserPackage.find({ status: "active" }).lean()) as LeanActivePackage[];
  if (packages.length === 0) {
    return { asOf: target.toISOString(), processed: 0, credited: 0, skipped: 0, errors: 0 };
  }

  // Fetch each buyer's lineage once (map by user id).
  const buyerIds = Array.from(new Set(packages.map((p) => p.user.toString())));
  const lineageUsers = await User.find({ _id: { $in: buyerIds } })
    .select("lineage")
    .lean() as LeanLineageUser[];
  const lineageByUser = new Map<string, string[]>();
  for (const u of lineageUsers) {
    lineageByUser.set(u._id.toString(), (u.lineage ?? []).map((a) => a.toString()));
  }

  // Cache the set of users holding an active package so the per-ancestor guard
  // is one set lookup instead of N `exists` calls.
  const activeUserIds = new Set(
    (await UserPackage.find({ status: "active" }).distinct("user")).map((id) => id.toString()),
  );
  const isActiveSponsor = (id: string): boolean => activeUserIds.has(id);

  // Accumulate per-ancestor earnings across all downline packages for the day.
  const accrual = new Map<string, number>();

  let skipped = 0;
  for (const up of packages) {
    try {
      const activatedAt = up.activatedAt instanceof Date ? up.activatedAt.getTime() : null;
      const expiresAt = up.expiresAt instanceof Date ? up.expiresAt.getTime() : null;
      if (activatedAt == null || expiresAt == null) {
        skipped++;
        continue;
      }
      if (!(activatedAt < end && expiresAt > start)) {
        skipped++;
        continue;
      }
      const s = up.snapshot;
      const yieldAmt = round2((s.priceUsd * s.dailyReturnPct) / 100);
      if (yieldAmt <= 0) {
        skipped++;
        continue;
      }

      // Walk the buyer's lineage from the closest ancestor (direct sponsor =
      // lineage[last]) up to `depth` levels. Level L earns `weights[L-1]`%.
      const lineage = lineageByUser.get(up.user.toString()) ?? [];
      for (let level = 1; level <= depth; level++) {
        const weight = weights[level - 1];
        if (!weight || weight <= 0) continue;
        // Closest ancestor is the last entry; level 1 = direct sponsor.
        const ancestorId = lineage[lineage.length - level];
        if (!ancestorId) continue;
        const share = round2((yieldAmt * weight) / 100);
        if (share <= 0) continue;
        accrual.set(ancestorId, round2((accrual.get(ancestorId) ?? 0) + share));
      }
    } catch (err) {
      logger.error("Team energy accrual failed for package", {
        userPackageId: up._id.toString(),
        date: key,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  let credited = 0;
  let errors = 0;
  for (const [ancestorId, amount] of accrual) {
    if (amount <= 0) continue;
    if (!isActiveSponsor(ancestorId)) {
      skipped++;
      continue;
    }
    try {
      await applyLedgerEntry({
        userId: ancestorId,
        wallet: "bonus",
        field: "available",
        direction: "credit",
        amount,
        type: "team_bonus",
        reference: { resource: "UserPackage", resourceId: `team-energy:${ancestorId}:${key}` },
        memo: "Daily team energy bonus",
        meta: { date: key, depth },
      });
      credited++;
      await ActivityLog.create({
        actor: ancestorId,
        action: "compensation.team_bonus",
        resource: "UserPackage",
        resourceId: `team-energy:${ancestorId}:${key}`,
        meta: { amount, date: key, depth },
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
 * Run the monthly community credit: each sponsor earns `communityPct`% of their
 * entire downline's trade yield for the calendar month. One `community_bonus`
 * credit per sponsor per month, idempotent via `community:<sponsorId>:<YYYY-MM>`.
 *
 * Eligibility (anti-farming): a sponsor only earns if they hold an active
 * UserPackage. No cron yet (Phase 18) — triggered by the admin
 * `POST /compensation/run-community` endpoint. `asOf` targets a specific month
 * for backfills; defaults to the current month.
 */
export async function runMonthlyCommunityBonus(asOf?: Date): Promise<CommunityRunSummary> {
  const target = asOf ?? new Date();
  const { start, end, key: monthKey } = utcMonthBounds(target);

  if (!(await isCommunityEnabled())) {
    return { month: monthKey, processed: 0, credited: 0, skipped: 0, errors: 0 };
  }

  const pct = await getCommunityPct();

  const sponsorIds = (await User.distinct("sponsorId", { sponsorId: { $ne: null } })).map((id) =>
    id.toString(),
  );
  if (sponsorIds.length === 0) {
    return { month: monthKey, processed: 0, credited: 0, skipped: 0, errors: 0 };
  }

  // Cache active-package sponsors once for the eligibility guard.
  const activeUserIds = new Set(
    (await UserPackage.find({ status: "active" }).distinct("user")).map((id) => id.toString()),
  );
  const isActiveSponsor = (id: string): boolean => activeUserIds.has(id);

  let credited = 0;
  let skipped = 0;
  let errors = 0;

  for (const sponsorId of sponsorIds) {
    try {
      if (!isActiveSponsor(sponsorId)) {
        skipped++;
        continue;
      }
      // Downline = every user whose lineage contains this sponsor (all levels).
      const downline = await User.find({ lineage: sponsorId }).select("_id").lean();
      const downlineIds = downline.map((u) => u._id);
      if (downlineIds.length === 0) {
        skipped++;
        continue;
      }

      const agg = await WalletTransaction.aggregate<{ _id: null; total: number }>([
        {
          $match: {
            user: { $in: downlineIds },
            type: "trading_yield",
            direction: "credit",
            createdAt: { $gte: start, $lt: end },
          },
        },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]);
      const total = agg[0]?.total ?? 0;
      const amount = round2((total * pct) / 100);
      if (amount <= 0) {
        skipped++;
        continue;
      }

      await applyLedgerEntry({
        userId: sponsorId,
        wallet: "bonus",
        field: "available",
        direction: "credit",
        amount,
        type: "community_bonus",
        reference: { resource: "User", resourceId: `community:${sponsorId}:${monthKey}` },
        memo: "Community monthly bonus",
        meta: { month: monthKey, pct, teamYield: total },
      });
      credited++;
      await ActivityLog.create({
        actor: sponsorId,
        action: "compensation.community_bonus",
        resource: "User",
        resourceId: `community:${sponsorId}:${monthKey}`,
        meta: { amount, month: monthKey, pct, teamYield: total },
      }).catch(() => undefined);
    } catch (err) {
      errors++;
      logger.error("Community bonus credit failed", {
        sponsorId,
        month: monthKey,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return {
    month: monthKey,
    processed: sponsorIds.length,
    credited,
    skipped,
    errors,
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

  const directCount = await User.countDocuments({ sponsorId: userId });
  let awarded = 0;
  let errors = 0;

  for (const offer of offers) {
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