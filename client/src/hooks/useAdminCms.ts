import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  fetchAdminPages,
  fetchAdminPage,
  createAdminPage,
  updateAdminPage,
  deleteAdminPage,
  type AdminCmsPagesParams,
} from "@/lib/adminCms";
import type { Page } from "@/lib/admin";
import { queryKeys } from "@/config";
import type {
  AdminCmsPage,
  AdminCmsPageListItem,
  CreateCmsPageBody,
  UpdateCmsPageBody,
} from "@zaminex/shared";

/* ------------------------------------------------------------------ */
/*  Reads                                                               */
/* ------------------------------------------------------------------ */

/** Paginated, searchable admin CMS page list (includes drafts). */
export function useAdminPages(params: AdminCmsPagesParams) {
  return useQuery<Page<AdminCmsPageListItem>>({
    queryKey: queryKeys.adminCmsPages.list(params),
    queryFn: () => fetchAdminPages(params),
    staleTime: 15_000,
    gcTime: 5 * 60_000,
    retry: 1,
  });
}

/** Full admin view of a single CMS page (any status). */
export function useAdminPage(slug: string | undefined) {
  return useQuery<AdminCmsPage>({
    queryKey: queryKeys.adminCmsPages.detail(slug ?? ""),
    queryFn: () => fetchAdminPage(slug as string),
    enabled: Boolean(slug),
    staleTime: 15_000,
    gcTime: 5 * 60_000,
    retry: 1,
  });
}

/* ------------------------------------------------------------------ */
/*  Mutations — invalidate the list (and the edited page's detail)      */
/* ------------------------------------------------------------------ */

/** POST /admin/cms/pages — create a page. */
export function useCreatePage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateCmsPageBody) => createAdminPage(body),
    onSuccess: async () => {
      toast.success("Page created");
      await qc.invalidateQueries({ queryKey: ["admin", "cms-pages", "list"] });
    },
    onError: () => {
      /* interceptor toasts (409 dup slug / 400 validation) */
    },
  });
}

/** PATCH /admin/cms/pages/:slug — update a page. */
export function useUpdatePage(slug?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateCmsPageBody) => updateAdminPage(slug as string, body),
    onSuccess: async () => {
      toast.success("Page saved");
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["admin", "cms-pages", "list"] }),
        ...(slug ? [qc.invalidateQueries({ queryKey: queryKeys.adminCmsPages.detail(slug) })] : []),
      ]);
    },
    onError: () => {
      /* interceptor toasts */
    },
  });
}

/** DELETE /admin/cms/pages/:slug — remove a page. */
export function useDeletePage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (slug: string) => deleteAdminPage(slug),
    onSuccess: async () => {
      toast.success("Page deleted");
      await qc.invalidateQueries({ queryKey: ["admin", "cms-pages", "list"] });
    },
    onError: () => {
      /* interceptor toasts */
    },
  });
}