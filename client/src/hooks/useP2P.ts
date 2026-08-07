import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { sendP2PTransfer, fetchP2PTransfers, type P2PTransferParams } from "@/lib/p2p";
import { queryKeys } from "@/config";
import toast from "react-hot-toast";
import type { WalletType } from "@zeminex/shared";

/** Paginated P2P transfer history. */
export function useP2PTransfers(params: P2PTransferParams) {
  return useQuery({
    queryKey: queryKeys.p2p.transfers(params),
    queryFn: () => fetchP2PTransfers(params),
    staleTime: 10_000,
    gcTime: 5 * 60_000,
    retry: 1,
  });
}

/** Send a P2P transfer. */
export function useSendP2PTransfer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { wallet: WalletType; amount: number; referralCode: string; memo?: string }) =>
      sendP2PTransfer(input),
    onSuccess: async () => {
      toast.success("Transfer sent successfully");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.p2p.transfers() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.wallet.balance }),
        queryClient.invalidateQueries({ queryKey: queryKeys.wallet.ledger() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard }),
      ]);
    },
    onError: () => { /* interceptor toasts */ },
  });
}