import { useQuery } from "@tanstack/react-query";
import { fetchBonanzaOverview } from "@/lib/bonanzas";
import { queryKeys } from "@/config";

/** The viewer's direct count + active bonanza offers with progress/award state. */
export function useBonanzaOverview() {
  return useQuery({
    queryKey: queryKeys.bonanzas.overview,
    queryFn: fetchBonanzaOverview,
    staleTime: 15_000,
    gcTime: 5 * 60_000,
    retry: 1,
  });
}