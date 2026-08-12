import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  fetchTickets,
  fetchTicket,
  createTicketRequest,
  replyToTicketRequest,
  type TicketListParams,
} from "@/lib/support";
import { queryKeys } from "@/config";
import type { CreateTicketBody } from "@zeminex/shared";

/** Invalidate the user's ticket list (and a specific ticket if provided). */
async function invalidateTickets(
  queryClient: ReturnType<typeof useQueryClient>,
  id?: string,
) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["support", "list"] }),
    ...(id ? [queryClient.invalidateQueries({ queryKey: queryKeys.support.detail(id) })] : []),
  ]);
}

/** The user's support tickets (paginated, filterable). */
export function useTickets(params: TicketListParams) {
  return useQuery({
    queryKey: queryKeys.support.list(params),
    queryFn: () => fetchTickets(params),
    staleTime: 15_000,
    gcTime: 5 * 60_000,
    retry: 1,
  });
}

/** Single support ticket. */
export function useTicket(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.support.detail(id ?? ""),
    queryFn: () => fetchTicket(id!),
    enabled: Boolean(id),
    staleTime: 15_000,
    gcTime: 5 * 60_000,
    retry: 1,
  });
}

/** Raise a new support ticket. */
export function useCreateTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTicketBody) => createTicketRequest(input),
    onSuccess: async (_row, input) => {
      toast.success("Support ticket created — we'll get back to you shortly.");
      await invalidateTickets(queryClient);
      void input;
    },
    onError: () => {
      /* interceptor toasts validation errors */
    },
  });
}

/** Reply to a ticket (reopens if answered/closed). */
export function useReplyTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, message }: { id: string; message: string }) => replyToTicketRequest(id, message),
    onSuccess: async (row) => {
      toast.success("Reply sent.");
      await invalidateTickets(queryClient, row.id);
    },
    onError: () => {
      /* interceptor toasts */
    },
  });
}