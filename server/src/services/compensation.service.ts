import { User, UserPackage, BonanzaOffer, ActivityLog, WalletTransaction } from "../models/index.js";
import { logger } from "../config/logger.js";
import { applyLedgerEntry } from "./wallet.service.js";
import { getDirectBonusPct, isYieldEnabled } from "./setting.service.js";
import type { YieldRunSummary, BonanzaEvalSummary } from "@zaminex/shared";

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