import { api } from "./axios";
import type { Page } from "./admin";
import type { BonanzaOfferRow, BonanzaStatus, CreateBonanzaBody, UpdateBonanzaBody } from "@zeminex/shared";

export interface AdminBonanzasParams {
  status?: BonanzaStatus;
  page?: number;
  limit?: number;
}

interface ListResponse {
  data: { bonanzas: Page<BonanzaOfferRow> };
}
interface OfferResponse {
  data: { bonanza: BonanzaOfferRow };
}

/** GET /bonanzas/admin — paginated, filterable offer list (admin). */
export async function fetchAdminBonanzas(params: AdminBonanzasParams): Promise<Page<BonanzaOfferRow>> {
  const { data } = await api.get<ListResponse>("/bonanzas/admin", { params });
  return data.data.bonanzas;
}

/** GET /bonanzas/admin/:id — single offer (admin). */
export async function fetchAdminBonanzaDetail(id: string): Promise<BonanzaOfferRow> {
  const { data } = await api.get<OfferResponse>(`/bonanzas/admin/${id}`);
  return data.data.bonanza;
}

/** POST /bonanzas/admin — create an offer (admin). */
export async function createAdminBonanza(body: CreateBonanzaBody): Promise<BonanzaOfferRow> {
  const { data } = await api.post<OfferResponse>("/bonanzas/admin", body);
  return data.data.bonanza;
}

/** PATCH /bonanzas/admin/:id — update an offer (admin). */
export async function updateAdminBonanza(id: string, body: UpdateBonanzaBody): Promise<BonanzaOfferRow> {
  const { data } = await api.patch<OfferResponse>(`/bonanzas/admin/${id}`, body);
  return data.data.bonanza;
}

/** DELETE /bonanzas/admin/:id — remove an offer (admin). */
export async function deleteAdminBonanza(id: string): Promise<void> {
  await api.delete(`/bonanzas/admin/${id}`);
}