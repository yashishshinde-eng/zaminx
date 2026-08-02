import { z } from "zod";

/* ----------------------------------------------------------------------------
 * Admin logs viewer (Phase 14C). Tails a Winston log file. `file` is
 * enum-validated (no path traversal); `lines` is the tail length (1–500).
 * ------------------------------------------------------------------------- */

export const adminLogsQuerySchema = z.object({
  query: z.object({
    file: z.enum(["combined", "error", "exceptions", "rejections"]).default("combined"),
    lines: z.coerce.number().int().min(1).max(500).default(200),
  }),
});