import { useQuery } from "@tanstack/react-query";
import { fetchDashboardSummary } from "@/lib/dashboard";
import { queryKeys } from "@/config";

export function useDashboardSummary() {
  return useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: fetchDashboardSummary,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    retry: 1,
  });
}