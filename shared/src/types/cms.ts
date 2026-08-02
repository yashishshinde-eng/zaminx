import { z } from "zod";
import {
  contentBlockSchema,
  cmsPageSchema,
  siteConfigSchema,
  contactSchema,
  createCmsPageSchema,
  updateCmsPageSchema,
  cmsPageListQuerySchema,
  siteConfigUpdateSchema,
  smtpSettingsSchema,
  smtpTestEmailSchema,
  nowpaymentsSettingsSchema,
} from "../schemas/cms.schema";

/** A single CMS content block. */
export type ContentBlock = z.infer<typeof contentBlockSchema>;

/** A full CMS page document (public shape). */
export type CmsPage = z.infer<typeof cmsPageSchema>;

/** Assembled public site configuration. */
export type SiteConfig = z.infer<typeof siteConfigSchema>;

/** A public page list entry (slug + title only). */
export interface PageListItem {
  slug: string;
  title: string;
}

/** Contact form request body. */
export type ContactBody = z.infer<typeof contactSchema>["body"];

/** SEO metadata for a page. */
export type PageSeo = { title?: string; description?: string };

/* ---- Phase 14B admin CMS ---- */

/** Admin page-list row (includes drafts + status + timestamps). */
export interface AdminCmsPageListItem {
  slug: string;
  title: string;
  status: "published" | "draft";
  publishedAt: string | null;
  updatedAt: string;
}

/** Full admin page document (any status, with timestamps). */
export interface AdminCmsPage {
  slug: string;
  title: string;
  blocks: ContentBlock[];
  seo: PageSeo;
  status: "published" | "draft";
  publishedAt: string | null;
  updatedAt: string;
}

/** Paginated admin page list response. */
export interface AdminCmsPagesPage {
  items: AdminCmsPageListItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export type CreateCmsPageBody = z.infer<typeof createCmsPageSchema>["body"];
export type UpdateCmsPageBody = z.infer<typeof updateCmsPageSchema>["body"];
export type CmsPageListQuery = z.infer<typeof cmsPageListQuerySchema>["query"];

/* ---- Phase 14B admin site config (the 9 cms.* fields) ---- */

export type SiteConfigUpdate = z.infer<typeof siteConfigUpdateSchema>["body"];

/* ---- Phase 14B SMTP settings (hybrid) ---- */

export interface SmtpSettings {
  host: string;
  port: number;
  from: string;
  /** True when SMTP_USER + SMTP_PASS are both set in env (credentials). */
  passwordConfigured: boolean;
  /** True when a host is set AND credentials are present (real outbound ready). */
  configured: boolean;
}

export type SmtpSettingsBody = z.infer<typeof smtpSettingsSchema>["body"];
export type SmtpTestEmailBody = z.infer<typeof smtpTestEmailSchema>["body"];

/* ---- Phase 14B NOWPayments settings (hybrid) ---- */

export interface NowpaymentsSettings {
  baseUrl: string;
  payCurrency: string;
  sandbox: boolean;
  /** True when NOWPAYMENTS_API_KEY + IPN_SECRET are both set in env. */
  configured: boolean;
}

export type NowpaymentsSettingsBody = z.infer<typeof nowpaymentsSettingsSchema>["body"];