import { useQuery } from "@tanstack/react-query";
import {
  fetchReferralStats,
  fetchDirectReferrals,
  fetchTreeChildren,
  type ReferralListParams,
  type ReferralChildrenParams,
} from "@/lib/referrals";
import { queryKeys } from "@/config";

/** Referral code/link + team statistics (direct + all-level counts + byLevel). */
export function useReferralStats() {
  return useQuery({
    queryKey: queryKeys.referrals.stats,
    queryFn: fetchReferralStats,
    staleTime: 15_000,
    gcTime: 5 * 60_000,
    retry: 1,
  });
}

/** The viewer's direct (level-1) referrals — paginated, filterable. */
export function useDirectReferrals(params: ReferralListParams) {
  return useQuery({
    queryKey: queryKeys.referrals.direct(params),
    queryFn: () => fetchDirectReferrals(params),
    staleTime: 15_000,
    gcTime: 5 * 60_000,
    retry: 1,
  });
}

/** Direct children of a node for lazy tree expansion (userId = "me" or an id). */
export function useTreeChildren(userId: string | undefined, params: ReferralChildrenParams) {
  return useQuery({
    queryKey: queryKeys.referrals.children(userId ?? "", params),
    queryFn: () => fetchTreeChildren(userId!, params),
    enabled: Boolean(userId),
    staleTime: 15_000,
    gcTime: 5 * 60_000,
    retry: 1,
  });
}