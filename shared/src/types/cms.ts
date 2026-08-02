import { z } from "zod";
import {
  contentBlockSchema,
  cmsPageSchema,
  siteConfigSchema,
  contactSchema,
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