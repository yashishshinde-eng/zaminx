import { useQuery } from "@tanstack/react-query";
import { fetchReport, fetchAdminReport, type ReportPayload } from "@/lib/reports";
import { queryKeys } from "@/config";
import type { UserReportKind, AdminReportKind, ReportQuery, AdminReportPayload } from "@zaminex/shared";

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

/** One admin report (platform-wide, paginated rows + summary). */
export function useAdminReport(kind: AdminReportKind, params: ReportQuery) {
  return useQuery<AdminReportPayload>({
    queryKey: queryKeys.adminReports.list(kind, params),
    queryFn: () => fetchAdminReport(kind, params),
    staleTime: 15_000,
    gcTime: 5 * 60_000,
    retry: 1,
  });
}