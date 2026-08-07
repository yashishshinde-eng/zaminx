import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  fetchWithdrawals,
  fetchWithdrawal,
  createWithdrawalRequest,
  cancelWithdrawalRequest,
  type WithdrawalListParams,
} from "@/lib/withdrawals";
import { queryKeys } from "@/config";
import type { WalletType } from "@zeminex/shared";

/** Invalidate everything a withdrawal touches: the list, wallet balances +
 *  ledger, and the dashboard (available/onHold totals change). */
async function invalidateWithdrawalDeps(queryClient: ReturnType<typeof useQueryClient>) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["withdrawals", "list"] }),
    queryClient.invalidateQueries({ queryKey: queryKeys.wallet.balance }),
    queryClient.invalidateQueries({ queryKey: ["wallet", "ledger"] }),
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard }),
  ]);
}

/** The user's withdrawals (paginated, filterable). */
export function useWithdrawals(params: WithdrawalListParams) {
  return useQuery({
    queryKey: queryKeys.withdrawals.list(params),
    queryFn: () => fetchWithdrawals(params),
    staleTime: 15_000,
    gcTime: 5 * 60_000,
    retry: 1,
  });
}

/** Single withdrawal. */
export function useWithdrawal(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.withdrawals.detail(id ?? ""),
    queryFn: () => fetchWithdrawal(id!),
    enabled: Boolean(id),
    staleTime: 15_000,
    gcTime: 5 * 60_000,
    retry: 1,
  });
}

/** Submit a withdrawal (available → onHold). */
export function useCreateWithdrawal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { wallet: WalletType; amount: number }) => createWithdrawalRequest(input),
    onSuccess: async () => {
      toast.success("Withdrawal submitted — pending admin approval.");
      await invalidateWithdrawalDeps(queryClient);
    },
    onError: () => {
      /* interceptor toasts (400 insufficient / no address / below min) */
    },
  });
}

/** Cancel a pending/under_review withdrawal (onHold → available). */
export function useCancelWithdrawal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => cancelWithdrawalRequest(id),
    onSuccess: async () => {
      toast.success("Withdrawal cancelled — funds returned to your balance.");
      await invalidateWithdrawalDeps(queryClient);
    },
    onError: () => {
      /* interceptor toasts (409 cannot cancel) */
    },
  });
}