import { useQuery } from "@tanstack/react-query";
import { fetchSiteConfig } from "@/lib/cms";

export function useSiteConfig() {
  return useQuery({
    queryKey: ["cms", "site"],
    queryFn: fetchSiteConfig,
    staleTime: 5 * 60_000, // site config rarely changes; cache aggressively
    gcTime: 30 * 60_000,
    retry: 1,
  });
}