import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchPackageCatalog, fetchMyPackages, activatePackageRequest, activatePackageForRequest, lookupPackageTarget } from "@/lib/packages";
import { queryKeys } from "@/config";
import { useAuth } from "@/context/AuthContext";

/** Active package catalog (investment tiers). */
export function usePackageCatalog() {
  return useQuery({
    queryKey: queryKeys.packages.catalog,
    queryFn: fetchPackageCatalog,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    retry: 1,
  });
}

/** The user's package subscriptions (activation history & status + payment). */
export function useMyPackages() {
  return useQuery({
    queryKey: queryKeys.packages.mine,
    queryFn: fetchMyPackages,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    retry: 1,
  });
}

/** Whether the user currently has a pending or active package. */
export function useHasOpenPackage(): boolean {
  const { data } = useMyPackages();
  return Boolean(data?.some((p) => p.status === "pending" || p.status === "active"));
}

/** Initiate a package activation from wallet balance (debit + active subscription). */
export function useActivatePackage() {
  const queryClient = useQueryClient();
  const { refreshUser } = useAuth();
  return useMutation({
    mutationFn: (packageId: string) => activatePackageRequest(packageId),
    onSuccess: async () => {
      // Activating a package promotes an inactive user to active — re-fetch so
      // the user object in context (and the InactiveUserBanner) updates immediately.
      // The success popup is rendered by the calling page (ActivationSuccessDialog).
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.packages.mine }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard }),
        queryClient.invalidateQueries({ queryKey: queryKeys.wallet.balance }),
        queryClient.invalidateQueries({ queryKey: queryKeys.payments.deposits }),
        queryClient.invalidateQueries({ queryKey: ["wallet", "ledger"] }),
        refreshUser(),
      ]);
    },
    onError: () => {
      /* interceptor toasts (e.g. 409 insufficient balance / already has a package) */
    },
  });
}

/** Resolve a referral code to a user (confirm the beneficiary before activating
 *  a package for them). Enabled only while a code is being checked. */
export function useLookupPackageTarget(code: string | undefined) {
  return useQuery({
    queryKey: ["packages", "lookup-target", code ?? ""],
    queryFn: () => lookupPackageTarget(code as string),
    enabled: !!code && code.trim().length > 0,
    staleTime: 0,
    gcTime: 0,
    retry: false,
    // Surface a 404 as an error state for the UI rather than a silent retry loop.
  });
}

/** An active user pays from their own Main wallet to activate a package for
 *  another inactive user (the beneficiary). Invalidates the actor's wallet +
 *  dashboard and the team/referral caches (the beneficiary's status flips). */
export function useActivatePackageFor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ packageId, targetUserId }: { packageId: string; targetUserId: string }) =>
      activatePackageForRequest(packageId, targetUserId),
    onSuccess: async () => {
      // The success popup is rendered by the calling dialog (ActivationSuccessDialog).
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.wallet.balance }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard }),
        queryClient.invalidateQueries({ queryKey: queryKeys.packages.mine }),
        queryClient.invalidateQueries({ queryKey: ["wallet", "ledger"] }),
        queryClient.invalidateQueries({ queryKey: ["referrals", "stats"] }),
        queryClient.invalidateQueries({ queryKey: ["referrals", "direct"] }),
        queryClient.invalidateQueries({ queryKey: ["referrals", "team"] }),
        queryClient.invalidateQueries({ queryKey: ["packages", "lookup-target"] }),
      ]);
    },
    onError: () => {
      /* interceptor toasts (403 not active / 409 already has a package / 404 target) */
    },
  });
}