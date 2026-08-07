import { api } from "./axios";
import type { Page } from "./admin";
import type {
  AdminCmsPage,
  AdminCmsPageListItem,
  AdminCmsPagesPage,
  CreateCmsPageBody,
  UpdateCmsPageBody,
} from "@zeminex/shared";

/** Admin CMS page-list query params (q / status / page / limit). */
export interface AdminCmsPagesParams {
  q?: string;
  status?: "published" | "draft";
  page?: number;
  limit?: number;
}

interface ListResponse {
  data: { pages: AdminCmsPagesPage };
}
interface PageResponse {
  data: { page: AdminCmsPage };
}

/** GET /admin/cms/pages — paginated, searchable page list (incl. drafts). */
export async function fetchAdminPages(params: AdminCmsPagesParams): Promise<Page<AdminCmsPageListItem>> {
  const { data } = await api.get<ListResponse>("/admin/cms/pages", { params });
  const p = data.data.pages;
  return { items: p.items, page: p.page, limit: p.limit, total: p.total, totalPages: p.totalPages };
}

/** GET /admin/cms/pages/:slug — single page, any status. */
export async function fetchAdminPage(slug: string): Promise<AdminCmsPage> {
  const { data } = await api.get<PageResponse>(`/admin/cms/pages/${slug}`);
  return data.data.page;
}

/** POST /admin/cms/pages — create a page. */
export async function createAdminPage(body: CreateCmsPageBody): Promise<AdminCmsPage> {
  const { data } = await api.post<PageResponse>("/admin/cms/pages", body);
  return data.data.page;
}

/** PATCH /admin/cms/pages/:slug — update a page. */
export async function updateAdminPage(slug: string, body: UpdateCmsPageBody): Promise<AdminCmsPage> {
  const { data } = await api.patch<PageResponse>(`/admin/cms/pages/${slug}`, body);
  return data.data.page;
}

/** DELETE /admin/cms/pages/:slug — remove a page. */
export async function deleteAdminPage(slug: string): Promise<void> {
  await api.delete(`/admin/cms/pages/${slug}`);
}