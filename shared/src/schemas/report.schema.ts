import { z } from "zod";

/** The 9 user report kinds (re-used by the server dispatcher + frontend tabs). */
export const USER_REPORT_KINDS = [
  "deposits",
  "withdrawals",
  "wallet",
  "trading",
  "direct",
  "team",
  "community",
  "rank",
  "bonanza",
] as const;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Shared query fields for every report (date range + status + search). */
const reportFilters = {
  from: z.string().regex(DATE_RE, "From must be YYYY-MM-DD").optional(),
  to: z.string().regex(DATE_RE, "To must be YYYY-MM-DD").optional(),
  status: z.string().trim().max(40).optional(),
  q: z.string().trim().max(60).optional(),
};

/** GET /reports/:kind — paginated, date-ranged, filterable report rows + summary. */
export const reportQuerySchema = z.object({
  query: z.object({
    ...reportFilters,
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
});

/** GET /reports/:kind/export — same filters, no pagination (service caps rows). */
export const reportExportQuerySchema = z.object({
  query: z.object({
    ...reportFilters,
    format: z.enum(["csv", "xls"]).default("csv"),
  }),
});

/** Path param: the report kind. */
export const reportKindParamSchema = z.object({
  params: z.object({
    kind: z.enum(USER_REPORT_KINDS),
  }),
});

export type ReportQuery = z.infer<typeof reportQuerySchema>["query"];
export type ReportExportQuery = z.infer<typeof reportExportQuerySchema>["query"];
export type ReportKindParam = z.infer<typeof reportKindParamSchema>["params"];