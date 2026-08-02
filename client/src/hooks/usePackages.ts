import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { fetchPackageCatalog, fetchMyPackages, activatePackageRequest } from "@/lib/packages";
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

/** The user's package subscriptions (activation history & status). */
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

/** Initiate a package activation (creates a pending subscription). */
export function useActivatePackage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (packageId: string) => activatePackageRequest(packageId),
    onSuccess: async (row) => {
      toast.success(`${row.snapshot.name} activation started — awaiting payment.`);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.packages.mine }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard }),
      ]);
    },
    onError: () => {
      /* interceptor toasts (e.g. 409 already has a package) */
    },
  });
}