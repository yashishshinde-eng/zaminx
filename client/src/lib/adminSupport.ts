import { api } from "./axios";
import type {
  AdminTicketPage,
  AdminTicketRow,
  TicketStatus,
  TicketCategory,
} from "@zeminex/shared";

interface ListResponse {
  data: { tickets: AdminTicketPage };
}
interface OneResponse {
  data: { ticket: AdminTicketRow };
}

export interface AdminTicketListParams {
  status?: TicketStatus;
  category?: TicketCategory;
  q?: string;
  page?: number;
  limit?: number;
}

/** GET /support/admin — all tickets (admin inbox). */
export async function fetchAdminTickets(params: AdminTicketListParams): Promise<AdminTicketPage> {
  const { data } = await api.get<ListResponse>("/support/admin", { params });
  return data.data.tickets;
}

/** GET /support/admin/:id — any ticket (admin). */
export async function fetchAdminTicket(id: string): Promise<AdminTicketRow> {
  const { data } = await api.get<OneResponse>(`/support/admin/${id}`);
  return data.data.ticket;
}

/** POST /support/admin/:id/reply — admin appends a message; → answered. */
export async function adminReplyTicketRequest(id: string, message: string): Promise<AdminTicketRow> {
  const { data } = await api.post<OneResponse>(`/support/admin/${id}/reply`, { message });
  return data.data.ticket;
}

/** PATCH /support/admin/:id/status — close or reopen a ticket. */
export async function adminUpdateTicketStatusRequest(
  id: string,
  status: "open" | "closed",
): Promise<AdminTicketRow> {
  const { data } = await api.patch<OneResponse>(`/support/admin/${id}/status`, { status });
  return data.data.ticket;
}