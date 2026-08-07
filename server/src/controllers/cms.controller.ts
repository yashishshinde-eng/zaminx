import type { RequestHandler } from "express";
import { siteConfigSchema, contactSchema, type SiteConfig } from "@zeminex/shared";
import { validate } from "../middlewares/validate.js";
import { contactLimiter } from "../middlewares/rateLimit.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ok, created } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { logger } from "../config/logger.js";
import { cached } from "../utils/cache.js";
import { Setting, CmsPage, ContactMessage } from "../models/index.js";

/** TTL for the public CMS reads (Phase 16). Public pages/site config change
 * rarely and are read on every site load; admin edits invalidate immediately. */
const CMS_CACHE_TTL = 30_000;

/** Raw settings rows mapped to SiteConfig field keys. */
const SETTING_KEYS = {
  siteName: "cms.siteName",
  website: "cms.website",
  tagline: "cms.tagline",
  logoLight: "cms.logoLight",
  logoDark: "cms.logoDark",
  navLinks: "cms.navLinks",
  footerText: "cms.footerText",
  contactDetails: "cms.contactDetails",
  socialLinks: "cms.socialLinks",
  seoDefaults: "cms.seoDefaults",
  announcementBar: "cms.announcementBar",
  maintenanceMode: "general.maintenanceMode",
} as const;

/** GET /cms/site — assemble public settings into a validated SiteConfig. */
export const getSiteConfig: RequestHandler[] = [
  asyncHandler(async (_req, res) => {
    const rows = await cached("cms:public-site-config", CMS_CACHE_TTL, () =>
      Setting.find({ isPublic: true }).lean(),
    );
    const byKey = new Map(rows.map((r) => [r.key, r.value]));

    const raw: Record<string, unknown> = {};
    for (const [field, key] of Object.entries(SETTING_KEYS)) {
      const value = byKey.get(key);
      if (value !== undefined) raw[field] = value;
    }

    // siteConfigSchema fills defaults for any missing/optional fields.
    const config: SiteConfig = siteConfigSchema.parse(raw);
    ok(res, config, "Site configuration");
  }),
];

/** GET /cms/pages — published page list (slug + title). */
export const listPages: RequestHandler[] = [
  asyncHandler(async (_req, res) => {
    const pages = await cached("cms:pages:list", CMS_CACHE_TTL, () =>
      CmsPage.find({ status: "published" })
        .sort("title")
        .select("slug title -_id")
        .lean(),
    );
    ok(res, pages, "Published pages");
  }),
];

/** GET /cms/pages/:slug — one published page. */
export const getPage: RequestHandler[] = [
  asyncHandler(async (req, res) => {
    const slug = req.params.slug?.toLowerCase();
    const page = await cached(`cms:page:${slug}`, CMS_CACHE_TTL, () =>
      CmsPage.findOne({ slug, status: "published" }).lean(),
    );
    if (!page) throw ApiError.notFound("Page not found");
    ok(
      res,
      {
        slug: page.slug,
        title: page.title,
        blocks: page.blocks ?? [],
        seo: page.seo ?? {},
      },
      page.title,
    );
  }),
];

/** POST /contact — store a contact message (email delivery in Phase 13). */
export const submitContact: RequestHandler[] = [
  contactLimiter,
  validate(contactSchema),
  asyncHandler(async (req, res) => {
    await ContactMessage.create({
      name: req.body.name,
      email: req.body.email,
      subject: req.body.subject,
      message: req.body.message,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });
    logger.info("Contact message received", { email: req.body.email });
    created(res, null, "Your message has been received. We'll get back to you soon.");
  }),
];