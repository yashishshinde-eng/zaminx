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