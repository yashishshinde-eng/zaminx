import type { NextFunction, Request, RequestHandler, Response } from "express";
import { ApiError } from "../utils/ApiError.js";

type Target = "body" | "query" | "params";

interface SafeParseOk<T> { success: true; data: T }
interface SafeParseErr { success: false; error: { issues: { path: (string | number)[]; message: string }[] } }
type SafeResult<T> = SafeParseOk<T> | SafeParseErr;

/**
 * Validate `req.body` / `req.query` / `req.params` against a Zod schema shaped as
 * `{ body: z.object({...}) }` (the shape our shared schemas use). On success the
 * parsed (and transformed/normalised) value replaces `req[target]`.
 */
export const validate =
  (schema: { safeParse: (v: unknown) => SafeResult<Record<string, unknown>> }, target: Target = "body"): RequestHandler =>
  (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse({ [target]: req[target] });
    if (!result.success) {
      const issues = result.error.issues.map((i) => ({
        path: i.path.slice(1).join(".") || i.path.join("."),
        message: i.message,
      }));
      return next(ApiError.badRequest("Validation failed", issues));
    }
    req[target] = result.data[target] as never;
    next();
  };