import { useQuery } from "@tanstack/react-query";
import { fetchReport, type ReportPayload } from "@/lib/reports";
import { queryKeys } from "@/config";
import type { UserReportKind, ReportQuery } from "@zaminex/shared";

/**
 * One user report (paginated rows + summary). Keyed by kind + the full query
 * (date range / status / search / page / limit) so changing tabs or filters
 * refetches. `staleTime: 15s` matches the other list hooks.
 */
export function useReport(kind: UserReportKind, params: ReportQuery) {
  return useQuery<ReportPayload>({
    queryKey: queryKeys.reports.list(kind, params),
    queryFn: () => fetchReport(kind, params),
    staleTime: 15_000,
    gcTime: 5 * 60_000,
    retry: 1,
  });
}