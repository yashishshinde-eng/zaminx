import { z } from "zod";

/* ----------------------------------------------------------------------------
 * CMS content blocks — structured, no raw HTML (XSS-safe).
 * Shared with the client so BlockRenderer is fully type-safe.
 * ------------------------------------------------------------------------- */

const heroBlock = z.object({
  type: z.literal("hero"),
  title: z.string().min(1),
  subtitle: z.string().optional(),
  ctaLabel: z.string().optional(),
  ctaHref: z.string().optional(),
});

const headingBlock = z.object({
  type: z.literal("heading"),
  level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  text: z.string().min(1),
});

const paragraphBlock = z.object({
  type: z.literal("paragraph"),
  text: z.string().min(1),
});

const featuresBlock = z.object({
  type: z.literal("features"),
  items: z
    .array(
      z.object({
        title: z.string().min(1),
        description: z.string().min(1),
        icon: z.string().optional(), // lucide icon name
      }),
    )
    .min(1),
});

const stepsBlock = z.object({
  type: z.literal("steps"),
  items: z
    .array(z.object({ title: z.string().min(1), description: z.string().min(1) }))
    .min(1),
});

const faqBlock = z.object({
  type: z.literal("faq"),
  items: z
    .array(z.object({ question: z.string().min(1), answer: z.string().min(1) }))
    .min(1),
});

const ctaBlock = z.object({
  type: z.literal("cta"),
  title: z.string().min(1),
  description: z.string().optional(),
  ctaLabel: z.string().optional(),
  ctaHref: z.string().optional(),
});

export const contentBlockSchema = z.discriminatedUnion("type", [
  heroBlock,
  headingBlock,
  paragraphBlock,
  featuresBlock,
  stepsBlock,
  faqBlock,
  ctaBlock,
]);

/* ----------------------------------------------------------------------------
 * CMS page
 * ------------------------------------------------------------------------- */

export const cmsPageSchema = z.object({
  slug: z.string().min(1).max(120).regex(/^[a-z0-9-]+$/, "slug must be lowercase, hyphenated"),
  title: z.string().min(1).max(200),
  blocks: z.array(contentBlockSchema),
  seo: z.object({
    title: z.string().max(200).optional(),
    description: z.string().max(300).optional(),
  }).default({}),
  status: z.enum(["published", "draft"]).default("draft"),
});

/* ----------------------------------------------------------------------------
 * Site config — assembled from public settings on the server.
 * ------------------------------------------------------------------------- */

const navLink = z.object({ label: z.string().min(1), href: z.string().min(1) });

export const siteConfigSchema = z.object({
  siteName: z.string().default("Zaminex"),
  tagline: z.string().optional(),
  logoLight: z.string().optional(), // url or null (falls back to text logo)
  logoDark: z.string().optional(),
  navLinks: z.array(navLink).default([]),
  footerText: z.string().optional(),
  contactDetails: z
    .object({
      email: z.string().optional(),
      phone: z.string().optional(),
      address: z.string().optional(),
    })
    .default({}),
  socialLinks: z
    .object({
      twitter: z.string().optional(),
      telegram: z.string().optional(),
      instagram: z.string().optional(),
      facebook: z.string().optional(),
      youtube: z.string().optional(),
    })
    .default({}),
  seoDefaults: z
    .object({ title: z.string().optional(), description: z.string().optional() })
    .default({}),
  announcementBar: z
    .object({
      enabled: z.boolean().default(false),
      message: z.string().default(""),
      link: z.string().optional(),
      linkLabel: z.string().optional(),
    })
    .default({}),
  maintenanceMode: z
    .object({ enabled: z.boolean().default(false), message: z.string().default("") })
    .default({}),
});

/* ----------------------------------------------------------------------------
 * Contact form
 * ------------------------------------------------------------------------- */

export const contactSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2, { message: "Name is required" }).max(80),
    email: z.string().trim().toLowerCase().email({ message: "Invalid email address" }),
    subject: z.string().trim().max(160).optional(),
    message: z.string().trim().min(10, { message: "Message must be at least 10 characters" }).max(5000),
  }),
});

/* ----------------------------------------------------------------------------
 * Admin CMS page CRUD (Phase 14B)
 * ------------------------------------------------------------------------- */

const pageStatus = z.enum(["published", "draft"]);

/** List query for the admin page index (includes drafts). */
export const cmsPageListQuerySchema = z.object({
  query: z.object({
    q: z.string().trim().optional(),
    status: pageStatus.optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(50).default(20),
  }),
});

/** `:slug` route param. */
export const cmsSlugParamSchema = z.object({
  params: z.object({
    slug: z.string().min(1).max(120).regex(/^[a-z0-9-]+$/),
  }),
});

/** Body for creating a page (slug is immutable after create). */
export const createCmsPageSchema = z.object({
  body: z.object({
    slug: cmsPageSchema.shape.slug,
    title: cmsPageSchema.shape.title,
    blocks: cmsPageSchema.shape.blocks,
    seo: cmsPageSchema.shape.seo.optional(),
    status: pageStatus.default("draft"),
  }),
});

/** Body for updating a page (everything optional; slug never changes). */
export const updateCmsPageSchema = z.object({
  body: z.object({
    title: cmsPageSchema.shape.title.optional(),
    blocks: cmsPageSchema.shape.blocks.optional(),
    seo: cmsPageSchema.shape.seo.optional(),
    status: pageStatus.optional(),
  }),
});

/* ----------------------------------------------------------------------------
 * Admin site-config update (Phase 14B) — the 9 `cms.*` fields only.
 * `general.maintenanceMode` is intentionally excluded (Phase 14C).
 * ------------------------------------------------------------------------- */

const navLinkField = navLink;
const contactDetailsField = siteConfigSchema.shape.contactDetails;
const socialLinksField = siteConfigSchema.shape.socialLinks;
const seoDefaultsField = siteConfigSchema.shape.seoDefaults;
const announcementBarField = siteConfigSchema.shape.announcementBar;

export const siteConfigUpdateSchema = z.object({
  body: z.object({
    siteName: z.string().optional(),
    tagline: z.string().optional(),
    logoLight: z.string().optional(),
    logoDark: z.string().optional(),
    navLinks: z.array(navLinkField).optional(),
    footerText: z.string().optional(),
    contactDetails: contactDetailsField.optional(),
    socialLinks: socialLinksField.optional(),
    seoDefaults: seoDefaultsField.optional(),
    announcementBar: announcementBarField.optional(),
  }),
});

/* ----------------------------------------------------------------------------
 * Admin SMTP settings (Phase 14B, hybrid). Non-secret fields only; the
 * SMTP user/password stay env-only and are surfaced as a `configured` flag.
 * ------------------------------------------------------------------------- */

export const smtpSettingsSchema = z.object({
  body: z.object({
    host: z.string().trim().optional(),
    port: z.coerce.number().int().positive().optional(),
    from: z.string().trim().optional(),
  }),
});

export const smtpTestEmailSchema = z.object({
  body: z.object({
    to: z.string().trim().toLowerCase().email({ message: "Invalid email address" }),
  }),
});

/* ----------------------------------------------------------------------------
 * Admin NOWPayments settings (Phase 14B, hybrid). Non-secret fields only;
 * the API key + IPN secret stay env-only and are surfaced as a `configured`
 * flag. `sandbox` forces the mock path even when credentials are present.
 * ------------------------------------------------------------------------- */

export const nowpaymentsSettingsSchema = z.object({
  body: z.object({
    baseUrl: z.string().trim().url().optional(),
    payCurrency: z.string().trim().min(1).optional(),
    sandbox: z.boolean().optional(),
  }),
});