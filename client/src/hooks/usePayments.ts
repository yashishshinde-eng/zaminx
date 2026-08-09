import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { createDepositRequest, fetchDeposit, simulatePaymentRequest } from "@/lib/payments";
import { queryKeys } from "@/config";

/** Invalidate everything a confirmed deposit touches. */
export async function invalidateAfterDepositChange(queryClient: ReturnType<typeof useQueryClient>) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.wallet.balance }),
    queryClient.invalidateQueries({ queryKey: queryKeys.payments.deposits }),
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard }),
    queryClient.invalidateQueries({ queryKey: ["wallet", "ledger"] }),
  ]);
}

/** Start a wallet deposit (amount → NOWPayments invoice). Returns the deposit
 *  with payment instructions (address/QR/hosted URL). */
export function useCreateDeposit() {
  return useMutation({
    mutationFn: (amount: number) => createDepositRequest(amount),
    onError: () => {
      /* interceptor toasts (e.g. validation / 429) */
    },
  });
}

/**
 * Polls a single deposit's status while it is pending. Used by the deposit
 * page to detect webhook confirmation (or the dev sandbox simulate) and flip
 * the UI to the success state. Stops polling once the deposit is no longer
 * pending (paid / expired / failed). Side effects on confirmation are handled
 * by the component (TanStack v5 dropped `onSuccess` from useQuery).
 */
export function useDepositStatus(depositId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.payments.detail(depositId ?? "none"),
    queryFn: () => fetchDeposit(depositId!),
    enabled: !!depositId && enabled,
    // Keep polling only while the deposit is still pending.
    refetchInterval: (query) => (query.state.data?.status === "pending" ? 3000 : false),
    refetchIntervalInBackground: true,
    staleTime: 0,
  });
}

/** Simulate a paid sandbox deposit (dev only) — flips the deposit to paid and
 *  credits the wallet. Shared by the package PaymentCard and the deposit page. */
export function useSimulatePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (depositId: string) => simulatePaymentRequest(depositId),
    onSuccess: async () => {
      toast.success("Payment confirmed — your wallet has been credited.");
      await invalidateAfterDepositChange(queryClient);
    },
    onError: () => {
      /* interceptor toasts */
    },
  });
}