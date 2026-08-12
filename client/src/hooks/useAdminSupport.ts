import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  fetchAdminTickets,
  fetchAdminTicket,
  adminReplyTicketRequest,
  adminUpdateTicketStatusRequest,
  type AdminTicketListParams,
} from "@/lib/adminSupport";
import { queryKeys } from "@/config";

/** Invalidate the admin inbox (and a specific ticket if provided). */
async function invalidateAdminTickets(
  queryClient: ReturnType<typeof useQueryClient>,
  id?: string,
) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["admin", "support", "list"] }),
    ...(id ? [queryClient.invalidateQueries({ queryKey: queryKeys.adminSupport.detail(id) })] : []),
  ]);
}

/** Admin inbox — all support tickets (paginated, filterable). */
export function useAdminTickets(params: AdminTicketListParams) {
  return useQuery({
    queryKey: queryKeys.adminSupport.list(params),
    queryFn: () => fetchAdminTickets(params),
    staleTime: 15_000,
    gcTime: 5 * 60_000,
    retry: 1,
  });
}

/** Single ticket (admin). */
export function useAdminTicket(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.adminSupport.detail(id ?? ""),
    queryFn: () => fetchAdminTicket(id!),
    enabled: Boolean(id),
    staleTime: 15_000,
    gcTime: 5 * 60_000,
    retry: 1,
  });
}

/** Admin replies to a ticket (→ answered). */
export function useAdminReplyTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, message }: { id: string; message: string }) => adminReplyTicketRequest(id, message),
    onSuccess: async (row) => {
      toast.success("Reply sent to user.");
      await invalidateAdminTickets(queryClient, row.id);
    },
    onError: () => {
      /* interceptor toasts */
    },
  });
}

/** Admin closes / reopens a ticket. */
export function useAdminTicketStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: "open" | "closed" }) =>
      adminUpdateTicketStatusRequest(id, status),
    onSuccess: async (row) => {
      toast.success(`Ticket ${row.status}.`);
      await invalidateAdminTickets(queryClient, row.id);
    },
    onError: () => {
      /* interceptor toasts */
    },
  });
}