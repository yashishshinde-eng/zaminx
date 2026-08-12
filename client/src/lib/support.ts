import { api } from "./axios";
import type {
  TicketPage,
  TicketRow,
  TicketStatus,
  TicketCategory,
  CreateTicketBody,
} from "@zeminex/shared";

interface ListResponse {
  data: { tickets: TicketPage };
}
interface OneResponse {
  data: { ticket: TicketRow };
}

export interface TicketListParams {
  status?: TicketStatus;
  category?: TicketCategory;
  page?: number;
  limit?: number;
}

/** GET /support — the user's tickets (paginated, filterable). */
export async function fetchTickets(params: TicketListParams): Promise<TicketPage> {
  const { data } = await api.get<ListResponse>("/support", { params });
  return data.data.tickets;
}

/** GET /support/:id — single ticket (ownership-checked). */
export async function fetchTicket(id: string): Promise<TicketRow> {
  const { data } = await api.get<OneResponse>(`/support/${id}`);
  return data.data.ticket;
}

/** POST /support — raise a new support ticket. */
export async function createTicketRequest(input: CreateTicketBody): Promise<TicketRow> {
  const { data } = await api.post<OneResponse>("/support", input);
  return data.data.ticket;
}

/** POST /support/:id/reply — append a message (reopens if answered/closed). */
export async function replyToTicketRequest(id: string, message: string): Promise<TicketRow> {
  const { data } = await api.post<OneResponse>(`/support/${id}/reply`, { message });
  return data.data.ticket;
}