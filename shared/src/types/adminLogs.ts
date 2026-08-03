import { z } from "zod";
import { adminLogsQuerySchema } from "../schemas/adminLogs.schema.js";

/* ----------------------------------------------------------------------------
 * Admin logs viewer (Phase 14C) — tail of a Winston log file.
 * ------------------------------------------------------------------------- */

export type AdminLogsQuery = z.infer<typeof adminLogsQuerySchema>["query"];

/** `file` query param (the Winston log file to tail). */
export type AdminLogFile = "combined" | "error" | "exceptions" | "rejections";

/** `GET /admin/logs` response — the last `lines` lines of a log file. */
export interface AdminLogsResult {
  file: AdminLogFile;
  /** False when the file doesn't exist (e.g. dev mode — file transport is prod-only). */
  exists: boolean;
  lines: string[];
  /** True when the file had more than `lines` lines (output was truncated to the tail). */
  truncated: boolean;
}