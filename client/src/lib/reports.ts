import { api } from "./axios";
import type {
  UserReportKind,
  AdminReportKind,
  ReportQuery,
  ReportExportFormat,
  DepositReport,
  WithdrawalReport,
  LedgerReport,
  P2PReport,
  AdminReportPayload,
} from "@zeminex/shared";

/** The report payload returned by `GET /reports/:kind` — narrowed by `kind`. */
export type ReportPayload = DepositReport | WithdrawalReport | LedgerReport | P2PReport;

interface ReportResponse {
  data: { report: ReportPayload };
}

/** GET /reports/:kind — paginated, date-ranged rows + summary for one report. */
export async function fetchReport(kind: UserReportKind, params: ReportQuery): Promise<ReportPayload> {
  const { data } = await api.get<ReportResponse>(`/reports/${kind}`, { params });
  return data.data.report;
}

export interface ReportExportParams {
  from?: string;
  to?: string;
  status?: string;
  type?: string;
  q?: string;
  format?: ReportExportFormat;
}

/**
 * GET /reports/:kind/export — download a CSV or Excel (.xls) file. Streams the
 * response as a blob and triggers a browser download via an object URL. The
 * filename is parsed from the `Content-Disposition` header when present.
 */
export async function downloadReport(kind: UserReportKind, params: ReportExportParams): Promise<void> {
  const res = await api.get(`/reports/${kind}/export`, {
    params,
    responseType: "blob",
  });
  triggerDownload(res.data as Blob, res.headers["content-disposition"], `report-${kind}.csv`);
}

/* ------------------------------------------------------------------ */
/*  Admin reports — Phase 11A                                          */
/* ------------------------------------------------------------------ */

interface AdminReportResponse {
  data: { report: AdminReportPayload };
}

/** GET /reports/admin/:kind — platform-wide admin report (paginated + summary). */
export async function fetchAdminReport(kind: AdminReportKind, params: ReportQuery): Promise<AdminReportPayload> {
  const { data } = await api.get<AdminReportResponse>(`/reports/admin/${kind}`, { params });
  return data.data.report;
}

/** GET /reports/admin/:kind/export — CSV or Excel (.xls) download (admin). */
export async function downloadAdminReport(kind: AdminReportKind, params: ReportExportParams): Promise<void> {
  const res = await api.get(`/reports/admin/${kind}/export`, {
    params,
    responseType: "blob",
  });
  triggerDownload(res.data as Blob, res.headers["content-disposition"], `admin-report-${kind}.csv`);
}

/** Stream a blob to the browser as a download, parsing the filename from Content-Disposition. */
function triggerDownload(blob: Blob, disposition: string | undefined, fallback: string): void {
  const filename = parseFilename(disposition) ?? fallback;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Extract `filename="..."` from a Content-Disposition header, if present. */
function parseFilename(disposition: string | undefined): string | null {
  if (!disposition) return null;
  const match = /filename="?([^";]+)"?/i.exec(disposition);
  return match ? match[1] : null;
}