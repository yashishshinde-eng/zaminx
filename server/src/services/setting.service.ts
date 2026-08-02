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