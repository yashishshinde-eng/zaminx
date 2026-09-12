/**
 * Daily Team Energy Bonus — one of the income systems consuming the Star
 * Qualification Engine (starQualification.service.ts). This module owns the
 * DAILY payout model only: the percentage table, the percentage money math and
 * the dashboard read model. Star qualification itself lives in the engine and
 * is shared with the Community Monthly Bonus (fixed $ amount, monthly on the
 * 10th) — the two income systems never re-implement it.
 *
 * Star N earns `pct[star]`% of the eligible bonus base (the downline scheduled
 * daily trade-yield volume within the star's depth — see `runDailyTeamEnergy`),
 * in integer cents × basis points, as ONE `team_bonus` credit per earning day.
 *
 * The engine's symbols are re-exported here under this module's historical
 * names so existing consumers (compensation, scripts, tests) keep importing
 * from one place.
 */
import mongoose from "mongoose";
import { User, WalletTransaction } from "../models/index.js";
import { getTeamEnergyDepth, getTeamEnergyPct } from "./setting.service.js";
import {
  MAX_STAR,
  STAR_REQUIREMENTS,
  computeQualifiedStar,
  perLevelActiveTeamCounts,
} from "./starQualification.service.js";
import type { TeamEnergyInfo, TeamEnergyLevelRow } from "@zeminex/shared";

/* Engine re-exports (compat names) — see starQualification.service.ts. */
export {
  MAX_STAR as MAX_TEAM_ENERGY_STAR,
  STAR_REQUIREMENTS,
  STAR_MONTHLY_BONUS_USD,
  monthlyBonusCentsForStar,
  computeQualifiedStar as computeEnergyStar,
  perLevelActiveTeamCounts,
  batchPerLevelActiveTeamCounts,
  recalcQualifiedStar as recalcTeamEnergyStar,
  recalcQualifiedStarsForChain as recalcTeamEnergyStarsForChain,
} from "./starQualification.service.js";

/** Daily payout table: index star−1 → daily bonus percentage (%). Defaults
 *  mirror the admin-tunable `compensation.teamEnergyPct` setting. */
export const STAR_PCT_TABLE: readonly number[] = [10, 5, 4, 3, 2, 1, 0.5, 0.5, 0.25, 0.25];

/** Percent → basis points, integer-exact (10 → 1000, 0.25 → 25). */
export function bpFromPct(pct: number): number {
  return Math.round(pct * 100);
}

/**
 * PURE money math: base (integer cents) × pct (basis points) → integer cents,
 * nearest-cent rounded. No floating-point percentage multiplication. This is
 * the DAILY Team Energy formula only — the Community Monthly Bonus is a fixed
 * amount (`monthlyBonusCentsForStar`), never a percentage.
 */
export function calcTeamEnergyBonusCents(baseCents: number, pctBp: number): number {
  if (baseCents <= 0 || pctBp <= 0) return 0;
  return Math.round((baseCents * pctBp) / 10_000);
}

/** Star payout rates in basis points from the admin setting, normalized to a
 *  10-slot array (index = star − 1; missing/short entries → 0 bp = that star
 *  pays nothing). */
export async function getTeamEnergyStarBps(): Promise<number[]> {
  const pcts = await getTeamEnergyPct();
  const bps: number[] = [];
  for (let star = 1; star <= MAX_STAR; star++) {
    const pct = pcts[star - 1];
    bps.push(pct && pct > 0 ? bpFromPct(pct) : 0);
  }
  return bps;
}

/* ------------------------------------------------------------------ */
/*  Read model — dashboard / GET /dashboard/team-energy                */
/* ------------------------------------------------------------------ */

/** UTC YYYY-MM-DD key for "now" (the current earning day). */
function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Read model for the dashboard card: recomputes the star live from the
 * authoritative DB via the shared engine (and syncs the persisted field if it
 * drifted), then assembles the per-level qualification table, next-star gap
 * and today/lifetime bonus totals. The persisted field is never trusted for
 * payouts or display.
 */
export async function getTeamEnergyInfo(userId: string): Promise<TeamEnergyInfo> {
  const depth = Math.min(await getTeamEnergyDepth(), MAX_STAR);
  const maxLevel = Math.max(1, Math.min(depth, MAX_STAR));
  const [counts, oid] = [await perLevelActiveTeamCounts(userId, maxLevel), new mongoose.Types.ObjectId(userId)];
  const star = computeQualifiedStar(counts);
  // Keep the persisted projection honest — fire-and-forget, display stays live.
  void User.updateOne({ _id: userId, teamEnergyStar: { $ne: star } }, { $set: { teamEnergyStar: star } }).catch(
    () => undefined,
  );

  const perLevel: TeamEnergyLevelRow[] = [];
  for (let level = 1; level <= maxLevel; level++) {
    const required = STAR_REQUIREMENTS[level];
    const activeCount = counts.get(level) ?? 0;
    perLevel.push({ level, activeCount, required, qualified: activeCount >= required });
  }

  const pct = star > 0 ? STAR_PCT_TABLE[star - 1] ?? 0 : 0;
  let teamMemberCount = 0;
  for (let level = 1; level <= star; level++) teamMemberCount += counts.get(level) ?? 0;

  let nextStar: TeamEnergyInfo["nextStar"] = null;
  if (star < MAX_STAR) {
    const nextLevel = star + 1;
    const required = STAR_REQUIREMENTS[nextLevel];
    const current = counts.get(nextLevel) ?? 0;
    nextStar = { level: nextLevel, required, current, gap: Math.max(0, required - current) };
  }

  const [todayAgg, totalAgg] = await Promise.all([
    WalletTransaction.aggregate<{ total: number }>([
      { $match: { user: oid, type: "team_bonus", direction: "credit", "meta.date": todayKey() } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    WalletTransaction.aggregate<{ total: number }>([
      { $match: { user: oid, type: "team_bonus", direction: "credit" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
  ]);

  return {
    starLevel: star,
    starPosition: star,
    bonusPercentage: pct,
    teamMemberCount,
    perLevel,
    nextStar,
    todayBonus: Math.round((todayAgg[0]?.total ?? 0) * 100) / 100,
    totalBonus: Math.round((totalAgg[0]?.total ?? 0) * 100) / 100,
  };
}