import type { RequestHandler } from "express";
import { reportKindParamSchema, reportQuerySchema, reportExportQuerySchema } from "@zeminex/shared";
import type { UserReportKind, ReportQuery, ReportExportQuery } from "@zeminex/shared";
import { validate } from "../middlewares/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ok } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import {
  getDepositReport,
  getWithdrawalReport,
  getLedgerReport,
  getP2PReport,
  getReportExport,
} from "../services/report.service.js";

/** GET /reports/:kind — paginated, date-ranged, filterable rows + summary. */
export const report: RequestHandler[] = [
  validate(reportKindParamSchema, "params"),
  validate(reportQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    const kind = (req.params as { kind: UserReportKind }).kind;
    // `validate` replaced `req.query` with the parsed value; cast through
    // `unknown` because Express still types it as `ParsedQs`.
    const q = req.query as unknown as ReportQuery;
    const args = { from: q.from, to: q.to, status: q.status, q: q.q, page: q.page, limit: q.limit };
    const report =
      kind === "deposits"
        ? await getDepositReport(req.user.id, args)
        : kind === "withdrawals"
          ? await getWithdrawalReport(req.user.id, args)
          : kind === "p2p"
            ? await getP2PReport(req.user.id, args)
            : await getLedgerReport(req.user.id, kind, args);
    ok(res, { report }, "Report");
  }),
];

/** GET /reports/:kind/export — CSV or Excel (.xls) download, same filters, no pagination. */
export const exportReport: RequestHandler[] = [
  validate(reportKindParamSchema, "params"),
  validate(reportExportQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    const kind = (req.params as { kind: UserReportKind }).kind;
    const q = req.query as unknown as ReportExportQuery;
    const { filename, mime, body } = await getReportExport(req.user.id, kind, {
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