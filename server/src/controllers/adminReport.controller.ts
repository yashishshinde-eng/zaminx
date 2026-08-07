import type { RequestHandler } from "express";
import { adminReportKindParamSchema, reportQuerySchema, reportExportQuerySchema } from "@zeminex/shared";
import type { AdminReportKind, ReportQuery, ReportExportQuery } from "@zeminex/shared";
import { validate } from "../middlewares/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ok } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { getAdminReport, getAdminReportExport } from "../services/adminReport.service.js";

/** GET /reports/admin/:kind — platform-wide admin report (paginated + summary). */
export const adminReport: RequestHandler[] = [
  validate(adminReportKindParamSchema, "params"),
  validate(reportQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    const kind = (req.params as { kind: AdminReportKind }).kind;
    // `validate` replaced `req.query` with the parsed value; cast through
    // `unknown` because Express still types it as `ParsedQs`.
    const q = req.query as unknown as ReportQuery;
    const args = { from: q.from, to: q.to, status: q.status, q: q.q, page: q.page, limit: q.limit };
    const report = await getAdminReport(kind, args);
    ok(res, { report }, "Admin report");
  }),
];

/** GET /reports/admin/:kind/export — CSV or Excel (.xls) download, same filters, no pagination. */
export const adminExport: RequestHandler[] = [
  validate(adminReportKindParamSchema, "params"),
  validate(reportExportQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    const kind = (req.params as { kind: AdminReportKind }).kind;
    const q = req.query as unknown as ReportExportQuery;
    const { filename, mime, body } = await getAdminReportExport(kind, {
      from: q.from,
      to: q.to,
      status: q.status,
      q: q.q,
      format: q.format,
    });
    res.setHeader("Content-Type", mime);
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(body);
  }),
];