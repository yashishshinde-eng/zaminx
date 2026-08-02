import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { fetchPackageCatalog, fetchMyPackages, activatePackageRequest } from "@/lib/packages";
import { simulatePaymentRequest } from "@/lib/payments";
import { queryKeys } from "@/config";

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

/** Initiate a package activation (creates a pending subscription + invoice). */
export function useActivatePackage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (packageId: string) => activatePackageRequest(packageId),
    onSuccess: async (res) => {
      toast.success(`${res.package.snapshot.name} activation started — complete the payment to activate.`);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.packages.mine }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard }),
        queryClient.invalidateQueries({ queryKey: queryKeys.wallet.balance }),
      ]);
    },
    onError: () => {
      /* interceptor toasts (e.g. 409 already has a package) */
    },
  });
}

/** Simulate a paid sandbox deposit (dev only) — flips the package to active. */
export function useSimulatePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (depositId: string) => simulatePaymentRequest(depositId),
    onSuccess: async () => {
      toast.success("Payment confirmed — your package is now active.");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.packages.mine }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard }),
        queryClient.invalidateQueries({ queryKey: queryKeys.wallet.balance }),
        queryClient.invalidateQueries({ queryKey: ["wallet", "ledger"] }),
      ]);
    },
    onError: () => {
      /* interceptor toasts */
    },
  });
}