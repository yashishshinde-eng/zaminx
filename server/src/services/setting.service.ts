import { Setting } from "../models/index.js";
import { env, isNowpaymentsConfigured } from "../config/env.js";
import type {
  CompensationSettings,
  CompensationSettingsBody,
  SiteConfigUpdate,
  SmtpSettings,
  SmtpSettingsBody,
  NowpaymentsSettings,
  NowpaymentsSettingsBody,
} from "@zaminex/shared";

/** Canonical field → Setting-key map for the 9 admin-editable `cms.*` fields.
 * Mirrors the controller's `SETTING_KEYS` but excludes `maintenanceMode`
 * (Phase 14C territory). Kept in sync with `cms.controller.ts`. */
const CMS_SETTING_KEYS: Record<keyof SiteConfigUpdate, string> = {
  siteName: "cms.siteName",
  tagline: "cms.tagline",
  logoLight: "cms.logoLight",
  logoDark: "cms.logoDark",
  navLinks: "cms.navLinks",
  footerText: "cms.footerText",
  contactDetails: "cms.contactDetails",
  socialLinks: "cms.socialLinks",
  seoDefaults: "cms.seoDefaults",
  announcementBar: "cms.announcementBar",
};

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

/* ---- Phase 14A — compensation settings read/update ---- */

/** Read the 7 compensation knobs as a single snapshot (Phase 14A admin UI). */
export async function getCompensationSettings(): Promise<CompensationSettings> {
  const [directBonusPct, yieldEnabled, teamEnergyEnabled, teamEnergyDepth, teamEnergyPct, communityEnabled, communityPct] =
    await Promise.all([
      getDirectBonusPct(),
      isYieldEnabled(),
      isTeamEnergyEnabled(),
      getTeamEnergyDepth(),
      getTeamEnergyPct(),
      isCommunityEnabled(),
      getCommunityPct(),
    ]);
  return { directBonusPct, yieldEnabled, teamEnergyEnabled, teamEnergyDepth, teamEnergyPct, communityEnabled, communityPct };
}

/** Update only the provided compensation knobs, then return the new snapshot. */
export async function updateCompensationSettings(body: CompensationSettingsBody): Promise<CompensationSettings> {
  if (body.directBonusPct !== undefined) await setSetting("compensation.directBonusPct", body.directBonusPct, "compensation");
  if (body.yieldEnabled !== undefined) await setSetting("compensation.yieldEnabled", body.yieldEnabled, "compensation");
  if (body.teamEnergyEnabled !== undefined) await setSetting("compensation.teamEnergyEnabled", body.teamEnergyEnabled, "compensation");
  if (body.teamEnergyDepth !== undefined) await setSetting("compensation.teamEnergyDepth", body.teamEnergyDepth, "compensation");
  if (body.teamEnergyPct !== undefined) await setSetting("compensation.teamEnergyPct", body.teamEnergyPct, "compensation");
  if (body.communityEnabled !== undefined) await setSetting("compensation.communityEnabled", body.communityEnabled, "compensation");
  if (body.communityPct !== undefined) await setSetting("compensation.communityPct", body.communityPct, "compensation");
  return getCompensationSettings();
}

/* ---- Phase 14B — admin site-config (the 9 cms.* fields) ---- */

/** Default values for the 9 cms.* fields (mirror the seeded defaults). */
const CMS_DEFAULTS: SiteConfigUpdate = {
  siteName: "Zaminex",
  tagline: "",
  logoLight: "",
  logoDark: "",
  navLinks: [],
  footerText: "",
  contactDetails: { email: "", phone: "", address: "" },
  socialLinks: { twitter: "", telegram: "", instagram: "", facebook: "", youtube: "" },
  seoDefaults: { title: "", description: "" },
  announcementBar: { enabled: false, message: "" },
};

/** Read the 9 admin-editable cms.* fields (with defaults for missing rows). */
export async function getAdminSiteConfig(): Promise<SiteConfigUpdate> {
  const [siteName, tagline, logoLight, logoDark, navLinks, footerText, contactDetails, socialLinks, seoDefaults, announcementBar] =
    await Promise.all([
      getSetting("cms.siteName", CMS_DEFAULTS.siteName),
      getSetting("cms.tagline", CMS_DEFAULTS.tagline),
      getSetting("cms.logoLight", CMS_DEFAULTS.logoLight),
      getSetting("cms.logoDark", CMS_DEFAULTS.logoDark),
      getSetting("cms.navLinks", CMS_DEFAULTS.navLinks),
      getSetting("cms.footerText", CMS_DEFAULTS.footerText),
      getSetting("cms.contactDetails", CMS_DEFAULTS.contactDetails),
      getSetting("cms.socialLinks", CMS_DEFAULTS.socialLinks),
      getSetting("cms.seoDefaults", CMS_DEFAULTS.seoDefaults),
      getSetting("cms.announcementBar", CMS_DEFAULTS.announcementBar),
    ]);
  return { siteName, tagline, logoLight, logoDark, navLinks, footerText, contactDetails, socialLinks, seoDefaults, announcementBar };
}

/** Update only the provided cms.* fields (all public — feed the website). */
export async function updateAdminSiteConfig(body: SiteConfigUpdate): Promise<SiteConfigUpdate> {
  (Object.keys(body) as (keyof SiteConfigUpdate)[]).forEach((field) => {
    if (body[field] !== undefined) {
      void setSetting(CMS_SETTING_KEYS[field], body[field], "cms", true);
    }
  });
  return getAdminSiteConfig();
}

/* ---- Phase 14B — SMTP settings (hybrid; secrets env-only) ---- */

/** Read non-secret SMTP fields from Settings (env fallback) + a `passwordConfigured`
 * flag derived from env (SMTP_USER + SMTP_PASS). Secrets never enter the DB. */
export async function getSmtpSettings(): Promise<SmtpSettings> {
  const host = await getSetting<string>("smtp.host", env.SMTP_HOST ?? "");
  const port = await getSetting<number>("smtp.port", env.SMTP_PORT);
  const from = await getSetting<string>("smtp.from", env.SMTP_FROM);
  const passwordConfigured = Boolean(env.SMTP_USER && env.SMTP_PASS);
  return { host, port, from, passwordConfigured, configured: Boolean(host && passwordConfigured) };
}

/** Update the provided non-secret SMTP fields in Settings (secrets stay env-only). */
export async function updateSmtpSettings(body: SmtpSettingsBody): Promise<SmtpSettings> {
  if (body.host !== undefined) await setSetting("smtp.host", body.host, "smtp");
  if (body.port !== undefined) await setSetting("smtp.port", body.port, "smtp");
  if (body.from !== undefined) await setSetting("smtp.from", body.from, "smtp");
  return getSmtpSettings();
}

/* ---- Phase 14B — NOWPayments settings (hybrid; secrets env-only) ---- */

/** Read non-secret NOWPayments fields from Settings (env fallback) + a `configured`
 * flag derived from env (API_KEY + IPN_SECRET). Secrets never enter the DB. */
export async function getNowpaymentsSettings(): Promise<NowpaymentsSettings> {
  const baseUrl = await getSetting<string>("payment.baseUrl", env.NOWPAYMENTS_BASE_URL);
  const payCurrency = await getSetting<string>("payment.payCurrency", env.NOWPAYMENTS_PAY_CURRENCY);
  const sandbox = await getSetting<boolean>("payment.sandbox", !isNowpaymentsConfigured());
  return { baseUrl, payCurrency, sandbox, configured: isNowpaymentsConfigured() };
}

/** Update the provided non-secret NOWPayments fields in Settings (secrets env-only). */
export async function updateNowpaymentsSettings(body: NowpaymentsSettingsBody): Promise<NowpaymentsSettings> {
  if (body.baseUrl !== undefined) await setSetting("payment.baseUrl", body.baseUrl, "payment");
  if (body.payCurrency !== undefined) await setSetting("payment.payCurrency", body.payCurrency, "payment");
  if (body.sandbox !== undefined) await setSetting("payment.sandbox", body.sandbox, "payment");
  return getNowpaymentsSettings();
}