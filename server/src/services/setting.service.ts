import { Setting } from "../models/index.js";

/**
 * Generic key/value configuration store (Phase 10). Wraps the `Setting` model
 * with typed read/upsert helpers. No cache — dev simplicity; reads are one
 * indexed lookup on `key`.
 */

/** Read a setting, falling back to `fallback` when unset (or null). */
export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const doc = await Setting.findOne({ key }).lean();
  return (doc?.value ?? fallback) as T;
}

/** Upsert a setting (creates it if missing, otherwise overwrites the value). */
export async function setSetting(
  key: string,
  value: unknown,
  category: "cms" | "smtp" | "payment" | "compensation" | "bonanza" | "general" | "security",
  isPublic = false,
) {
  await Setting.findOneAndUpdate(
    { key },
    { $set: { key, value, category, isPublic, updatedAt: new Date() } },
    { upsert: true },
  );
}

/* ---- Compensation convenience reads ---- */

/** Direct-connect bonus percentage (default 10 = 10%). */
export async function getDirectBonusPct(): Promise<number> {
  return getSetting<number>("compensation.directBonusPct", 10);
}

/** Whether the daily trade-yield run is enabled (default true). */
export async function isYieldEnabled(): Promise<boolean> {
  return getSetting<boolean>("compensation.yieldEnabled", true);
}

/* ---- Phase 10A compensation convenience reads ---- */

/** Whether the daily team-energy run is enabled (default true). */
export async function isTeamEnergyEnabled(): Promise<boolean> {
  return getSetting<boolean>("compensation.teamEnergyEnabled", true);
}

/** How many ancestor levels a team-energy run pays (default 5). */
export async function getTeamEnergyDepth(): Promise<number> {
  return getSetting<number>("compensation.teamEnergyDepth", 5);
}

/** Per-level team-energy weights, level 1 = direct sponsor (default [10,5,3,2,1]). */
export async function getTeamEnergyPct(): Promise<number[]> {
  return getSetting<number[]>("compensation.teamEnergyPct", [10, 5, 3, 2, 1]);
}

/** Whether the monthly community-bonus run is enabled (default true). */
export async function isCommunityEnabled(): Promise<boolean> {
  return getSetting<boolean>("compensation.communityEnabled", true);
}

/** Community bonus percentage of the team's monthly trade yield (default 5 = 5%). */
export async function getCommunityPct(): Promise<number> {
  return getSetting<number>("compensation.communityPct", 5);
}