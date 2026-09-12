/**
 * Star Qualification Engine — the ONE centralized star-qualification service
 * (user architecture rule). It is responsible ONLY for determining a user's
 * highest sequentially qualified star level from the authoritative database.
 *
 * It never calculates or distributes income. Every income system consumes its
 * result with its own payout table, calculation function, transaction type,
 * schedule and duplicate-payment protection:
 *   - Daily Team Energy Bonus → teamEnergy.service.ts (percentage of downline
 *     yield, one credit per earning day).
 *   - Community Monthly Bonus → compensation.service.ts (fixed $ amount from
 *     `STAR_MONTHLY_BONUS_USD`, one credit per distribution month on the 10th).
 * No income system may re-implement star qualification.
 *
 * Star N requires at least 3^N ACTIVE members (package-activated, i.e.
 * `User.status === "active"`) AT lineage level N, and the walk is sequential:
 * level 1 must pass before level 2 is evaluated, so a large deep downline can
 * never bypass an incomplete level 1 — mixed-level counts are never summed
 * across levels (1 member at level 1 + 8 at level 2 = no star).
 *
 * The star is persisted on `User.teamEnergyStar` as a non-sticky projection of
 * `computeQualifiedStar` — a read model, never a payout input. It is a
 * different, unrelated star from the sticky rank-ladder `User.highestStar`.
 */
import mongoose from "mongoose";
import { User } from "../models/index.js";

export const MAX_STAR = 10;

/**
 * Index = star (index 0 unused): required ACTIVE members AT lineage level N.
 * 1★=3, 2★=9, 3★=27 … 10★=59049 (3^N).
 */
export const STAR_REQUIREMENTS: readonly number[] = [0, 3, 9, 27, 81, 243, 729, 2187, 6561, 19683, 59049];

/**
 * Community Monthly Bonus — the star's FIXED monthly $ amount (index = star − 1),
 * per the spec table. Never a percentage of any income; paid once per
 * distribution month on the 10th. Integer-safe: use `monthlyBonusCentsForStar`.
 */
export const STAR_MONTHLY_BONUS_USD: readonly number[] = [10, 20, 50, 100, 250, 500, 1000, 2000, 5000, 10000];

/**
 * PURE money math: the fixed monthly Community Bonus for a star, in integer
 * cents (USD × 100). 0 for an unqualified / out-of-range star — no floating
 * point anywhere in the financial path.
 */
export function monthlyBonusCentsForStar(star: number): number {
  if (star < 1 || star > MAX_STAR) return 0;
  return Math.round((STAR_MONTHLY_BONUS_USD[star - 1] ?? 0) * 100);
}

/**
 * PURE sequential star qualification: star N counts ACTIVE members at level N
 * (3^N); the walk stops at the first level that misses its requirement, so a
 * large deep downline can never bypass a failed lower level.
 */
export function computeQualifiedStar(
  activeCountByLevel: ReadonlyMap<number, number>,
  maxStar: number = MAX_STAR,
): number {
  let star = 0;
  for (let level = 1; level <= Math.min(maxStar, MAX_STAR); level++) {
    const required = STAR_REQUIREMENTS[level];
    const count = activeCountByLevel.get(level) ?? 0;
    if (count >= required) {
      star = level;
    } else {
      break;
    }
  }
  return star;
}

/* ------------------------------------------------------------------ */
/*  Per-level ACTIVE member counts (DB read models)                    */
/* ------------------------------------------------------------------ */

/**
 * ACTIVE members per lineage level for one user (levels 1..maxLevel).
 * Same level expression as `getReferralStats` (referral.service.ts):
 * level = size(lineage) − index(lineage, viewer); 1 = direct members.
 */
export async function perLevelActiveTeamCounts(
  userId: string,
  maxLevel: number = MAX_STAR,
): Promise<Map<number, number>> {
  const viewerOid = new mongoose.Types.ObjectId(userId);
  const rows = await User.aggregate<{ _id: number; n: number }>([
    { $match: { lineage: viewerOid, status: "active" } },
    {
      $project: {
        level: { $subtract: [{ $size: "$lineage" }, { $indexOfArray: ["$lineage", viewerOid] }] },
      },
    },
    { $match: { level: { $gte: 1, $lte: maxLevel } } },
    { $group: { _id: "$level", n: { $sum: 1 } } },
  ]);
  const counts = new Map<number, number>();
  for (const r of rows) counts.set(r._id, r.n);
  return counts;
}

/**
 * Batch version of `perLevelActiveTeamCounts` for many ancestors at once —
 * one aggregation instead of N (used by the payout runs). Returns
 * ancestorId → (level → ACTIVE member count).
 */
export async function batchPerLevelActiveTeamCounts(
  ancestorIds: string[],
  maxLevel: number = MAX_STAR,
): Promise<Map<string, Map<number, number>>> {
  const out = new Map<string, Map<number, number>>();
  if (ancestorIds.length === 0) return out;
  const ancestorOids = ancestorIds.map((id) => new mongoose.Types.ObjectId(id));
  // Cast to ObjectId: the aggregation `$match` does not auto-cast strings
  // (same gotcha documented in dashboard.service.ts).
  const rows = await User.aggregate<{ _id: { ancestor: mongoose.Types.ObjectId; level: number }; n: number }>([
    { $match: { lineage: { $in: ancestorOids }, status: "active" } },
    { $project: { _id: 0, lineage: 1, size: { $size: "$lineage" } } },
    { $unwind: { path: "$lineage", includeArrayIndex: "idx" } },
    { $match: { lineage: { $in: ancestorOids } } },
    { $project: { ancestor: "$lineage", level: { $subtract: ["$size", "$idx"] } } },
    { $match: { level: { $gte: 1, $lte: maxLevel } } },
    { $group: { _id: { ancestor: "$ancestor", level: "$level" }, n: { $sum: 1 } } },
  ]);
  for (const r of rows) {
    const key = r._id.ancestor.toString();
    const level = r._id.level;
    let byLevel = out.get(key);
    if (!byLevel) {
      byLevel = new Map<number, number>();
      out.set(key, byLevel);
    }
    byLevel.set(level, r.n);
  }
  return out;
}

/* ------------------------------------------------------------------ */
/*  Star persistence                                                   */
/* ------------------------------------------------------------------ */

/** Recompute + persist (non-sticky `$set`) one user's teamEnergyStar. */
export async function recalcQualifiedStar(userId: string, maxLevel?: number): Promise<number> {
  const counts = await perLevelActiveTeamCounts(userId, maxLevel);
  const star = computeQualifiedStar(counts);
  await User.updateOne({ _id: userId }, { $set: { teamEnergyStar: star } });
  return star;
}

/**
 * Recalc every ancestor in a lineage chain — after a new/activated member
 * changes their per-level counts. Best-effort: callers fire-and-forget with
 * `.catch` so a failed recalc never blocks registration/activation.
 */
export async function recalcQualifiedStarsForChain(ancestorIds: string[]): Promise<void> {
  const seen = new Set<string>();
  for (const id of ancestorIds) {
    if (!id || seen.has(id)) continue;
    seen.add(id);
    await recalcQualifiedStar(id).catch(() => undefined);
  }
}