import { CmsPage, ActivityLog } from "../models/index.js";
import { ApiError } from "../utils/ApiError.js";
import { cmsPageSchema } from "@zaminex/shared";
import type {
  AdminCmsPage,
  AdminCmsPageListItem,
  AdminCmsPagesPage,
  CreateCmsPageBody,
  UpdateCmsPageBody,
} from "@zaminex/shared";

/* ------------------------------------------------------------------ */
/*  Mapper                                                             */
/* ------------------------------------------------------------------ */

type LeanPage = {
  slug: string;
  title: string;
  blocks?: unknown[];
  seo?: { title?: string; description?: string } | null;
  status?: string | null;
  publishedAt?: Date | string | null;
  updatedAt?: Date | string;
};

function toIso(d: Date | string | null | undefined): string {
  if (d instanceof Date) return d.toISOString();
  if (typeof d === "string") return d;
  return new Date().toISOString();
}

function toListItem(p: LeanPage): AdminCmsPageListItem {
  return {
    slug: p.slug,
    title: p.title,
    status: (p.status ?? "draft") as "published" | "draft",
    publishedAt: p.publishedAt ? toIso(p.publishedAt) : null,
    updatedAt: toIso(p.updatedAt),
  };
}

function toAdminPage(p: LeanPage): AdminCmsPage {
  return {
    slug: p.slug,
    title: p.title,
    blocks: (p.blocks ?? []) as AdminCmsPage["blocks"],
    seo: (p.seo ?? {}) as AdminCmsPage["seo"],
    status: (p.status ?? "draft") as "published" | "draft",
    publishedAt: p.publishedAt ? toIso(p.publishedAt) : null,
    updatedAt: toIso(p.updatedAt),
  };
}

/* ------------------------------------------------------------------ */
/*  Admin CRUD                                                         */
/* ------------------------------------------------------------------ */

export interface ListAdminPagesArgs {
  q?: string;
  status?: "published" | "draft";
  page: number;
  limit: number;
}

/** `GET /admin/cms/pages` — paginated, searchable page list (incl. drafts). */
export async function listAdminPages(args: ListAdminPagesArgs): Promise<AdminCmsPagesPage> {
  const page = Math.max(1, args.page);
  const limit = Math.min(50, Math.max(1, args.limit));
  const filter: Record<string, unknown> = {};
  if (args.status) filter.status = args.status;
  if (args.q && args.q.trim()) {
    const rx = new RegExp(args.q.trim(), "i");
    filter.$or = [{ title: rx }, { slug: rx }];
  }

  const [rows, total] = await Promise.all([
    CmsPage.find(filter).sort({ updatedAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    CmsPage.countDocuments(filter),
  ]);

  return {
    items: rows.map((r) => toListItem(r as never)),
    page,
    limit,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / limit),
  };
}

/** `GET /admin/cms/pages/:slug` — single page, any status (admin). */
export async function getAdminPage(slug: string): Promise<AdminCmsPage> {
  const p = await CmsPage.findOne({ slug }).lean();
  if (!p) throw ApiError.notFound("Page not found");
  return toAdminPage(p as never);
}

/** `POST /admin/cms/pages` — create a page (admin). */
export async function createAdminPage(adminId: string, body: CreateCmsPageBody): Promise<AdminCmsPage> {
  // Defensive re-validation (route already validates, but this guarantees the
  // stored shape and applies seo/status defaults consistently).
  const parsed = cmsPageSchema.parse({
    slug: body.slug,
    title: body.title,
    blocks: body.blocks,
    seo: body.seo ?? {},
    status: body.status ?? "draft",
  });

  const dup = await CmsPage.findOne({ slug: parsed.slug }).lean();
  if (dup) throw ApiError.conflict("A page with that slug already exists");

  const created = await CmsPage.create({
    slug: parsed.slug,
    title: parsed.title,
    blocks: parsed.blocks,
    seo: parsed.seo,
    status: parsed.status,
    publishedAt: parsed.status === "published" ? new Date() : null,
  });

  await ActivityLog.create({
    actor: adminId,
    action: "cms.page_create",
    resource: "CmsPage",
    resourceId: parsed.slug,
    meta: { title: parsed.title, status: parsed.status },
  });

  return toAdminPage(created.toObject() as never);
}

/** `PATCH /admin/cms/pages/:slug` — update a page (admin). */
export async function updateAdminPage(adminId: string, slug: string, patch: UpdateCmsPageBody): Promise<AdminCmsPage> {
  const page = await CmsPage.findOne({ slug });
  if (!page) throw ApiError.notFound("Page not found");

  if (patch.title !== undefined) page.title = patch.title;
  if (patch.blocks !== undefined) page.blocks = patch.blocks;
  if (patch.seo !== undefined) page.seo = patch.seo;
  if (patch.status !== undefined && patch.status !== page.status) {
    page.status = patch.status;
    page.publishedAt = patch.status === "published" ? new Date() : null;
  }

  await page.save();

  await ActivityLog.create({
    actor: adminId,
    action: "cms.page_update",
    resource: "CmsPage",
    resourceId: slug,
    meta: { fields: Object.keys(patch) },
  });

  return toAdminPage(page.toObject() as never);
}

/** `DELETE /admin/cms/pages/:slug` — remove a page (admin). */
export async function deleteAdminPage(adminId: string, slug: string): Promise<void> {
  const res = await CmsPage.deleteOne({ slug });
  if (res.deletedCount === 0) throw ApiError.notFound("Page not found");

  await ActivityLog.create({
    actor: adminId,
    action: "cms.page_delete",
    resource: "CmsPage",
    resourceId: slug,
  });
}