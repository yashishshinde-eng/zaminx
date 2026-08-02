import type { RequestHandler } from "express";
import {
  cmsPageListQuerySchema,
  cmsSlugParamSchema,
  createCmsPageSchema,
  updateCmsPageSchema,
} from "@zaminex/shared";
import { validate } from "../middlewares/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ok, created } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import {
  listAdminPages,
  getAdminPage,
  createAdminPage,
  updateAdminPage,
  deleteAdminPage,
} from "../services/cmsAdmin.service.js";
import type { CmsPageListQuery, CreateCmsPageBody, UpdateCmsPageBody } from "@zaminex/shared";

/** GET /admin/cms/pages — paginated, searchable page list (incl. drafts). */
export const listPages: RequestHandler[] = [
  validate(cmsPageListQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    const q = req.query as unknown as CmsPageListQuery;
    const pages = await listAdminPages({
      q: q.q,
      status: q.status,
      page: q.page,
      limit: q.limit,
    });
    ok(res, { pages }, "CMS pages");
  }),
];

/** GET /admin/cms/pages/:slug — single page, any status. */
export const getPage: RequestHandler[] = [
  validate(cmsSlugParamSchema, "params"),
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    const { slug } = req.params as { slug: string };
    const page = await getAdminPage(slug);
    ok(res, { page }, "CMS page");
  }),
];

/** POST /admin/cms/pages — create a page. */
export const createPage: RequestHandler[] = [
  validate(createCmsPageSchema),
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    const page = await createAdminPage(req.user.id, req.body as CreateCmsPageBody);
    created(res, { page }, "CMS page created");
  }),
];

/** PATCH /admin/cms/pages/:slug — update a page. */
export const updatePage: RequestHandler[] = [
  validate(cmsSlugParamSchema, "params"),
  validate(updateCmsPageSchema),
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    const { slug } = req.params as { slug: string };
    const page = await updateAdminPage(req.user.id, slug, req.body as UpdateCmsPageBody);
    ok(res, { page }, "CMS page updated");
  }),
];

/** DELETE /admin/cms/pages/:slug — remove a page. */
export const deletePage: RequestHandler[] = [
  validate(cmsSlugParamSchema, "params"),
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    const { slug } = req.params as { slug: string };
    await deleteAdminPage(req.user.id, slug);
    ok(res, null, "CMS page deleted");
  }),
];