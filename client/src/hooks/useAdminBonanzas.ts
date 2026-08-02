import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  fetchAdminBonanzas,
  createAdminBonanza,
  updateAdminBonanza,
  deleteAdminBonanza,
  type AdminBonanzasParams,
} from "@/lib/adminBonanzas";
import type { Page } from "@/lib/admin";
import { queryKeys } from "@/config";
import type { BonanzaOfferRow, CreateBonanzaBody, UpdateBonanzaBody } from "@zaminex/shared";

/** Paginated, filterable admin bonanza offer list. */
export function useAdminBonanzas(params: AdminBonanzasParams) {
  return useQuery<Page<BonanzaOfferRow>>({
    queryKey: queryKeys.bonanzas.list(params),
    queryFn: () => fetchAdminBonanzas(params),
    staleTime: 15_000,
    gcTime: 5 * 60_000,
    retry: 1,
  });
}

/** Invalidate the admin bonanza list after any CRUD mutation. */
function useInvalidateBonanzas() {
  const qc = useQueryClient();
  return async () => {
    await qc.invalidateQueries({ queryKey: ["bonanzas", "admin-list"] });
  };
}

/** POST /bonanzas/admin — create an offer. */
export function useCreateBonanza() {
  const invalidate = useInvalidateBonanzas();
  return useMutation({
    mutationFn: (body: CreateBonanzaBody) => createAdminBonanza(body),
    onSuccess: async () => {
      toast.success("Bonanza offer created");
      await invalidate();
    },
    onError: () => {
      /* interceptor toasts (validation) */
    },
  });
}

/** PATCH /bonanzas/admin/:id — update an offer (incl. status toggle). */
export function useUpdateBonanza() {
  const invalidate = useInvalidateBonanzas();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateBonanzaBody }) => updateAdminBonanza(id, body),
    onSuccess: async () => {
      toast.success("Bonanza offer updated");
      await invalidate();
    },
    onError: () => {
      /* interceptor toasts */
    },
  });
}

/** DELETE /bonanzas/admin/:id — remove an offer. */
export function useDeleteBonanza() {
  const invalidate = useInvalidateBonanzas();
  return useMutation({
    mutationFn: (id: string) => deleteAdminBonanza(id),
    onSuccess: async () => {
      toast.success("Bonanza offer deleted");
      await invalidate();
    },
    onError: () => {
      /* interceptor toasts */
    },
  });
}