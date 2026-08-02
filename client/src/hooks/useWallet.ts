import { useQuery } from "@tanstack/react-query";
import { fetchWallet, fetchWalletLedger, type WalletLedgerParams } from "@/lib/wallet";
import { queryKeys } from "@/config";

/** The user's wallet balances (Main / Bonus / Trading + totals). */
export function useWallet() {
  return useQuery({
    queryKey: queryKeys.wallet.balance,
    queryFn: fetchWallet,
    staleTime: 15_000,
    gcTime: 5 * 60_000,
    retry: 1,
  });
}

/** Paginated, filterable wallet ledger history. */
export function useWalletLedger(params: WalletLedgerParams) {
  return useQuery({
    queryKey: queryKeys.wallet.ledger(params),
    queryFn: () => fetchWalletLedger(params),
    staleTime: 10_000,
    gcTime: 5 * 60_000,
    retry: 1,
  });
}