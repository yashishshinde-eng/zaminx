import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";
import mongoose from "mongoose";
import { ApiError } from "../utils/ApiError.js";
import { logger } from "../config/logger.js";
import { isProd } from "../config/env.js";

/** 404 handler — kept here too so routes can drop straight into it. The full
 * route echo is useful in dev but leaks the route surface in prod, so the
 * client-facing message is generic there. */
export const notFoundHandler: RequestHandler = (req, _res, next) => {
  const message = isProd ? "Not found" : `Route not found: ${req.method} ${req.originalUrl}`;
  next(ApiError.notFound(message));
};

/** Body-parser (express.json) throws errors whose `type` begins with `entity.`
 * (`entity.parse.failed` → 400, `entity.too.large` → 413) and carries a numeric
 * `status`. Detecting by `type` avoids importing the body-parser error class. */
function bodyParserError(err: unknown): { statusCode: number; message: string } | null {
  const e = err as { type?: string; status?: number };
  if (typeof e.type !== "string" || !e.type.startsWith("entity.")) return null;
  if (e.status === 413) return { statusCode: 413, message: "Request body too large" };
  return { statusCode: 400, message: "Malformed JSON body" };
}

/** Centralised error handler — the last middleware in the chain. */
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  let statusCode = 500;
  let message = "Internal server error";
  let details: unknown | undefined;
  let operational = false;
  let headers: Record<string, string> | undefined;

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    details = err.details;
    operational = err.isOperational;
    headers = err.headers;
  } else if (err instanceof ZodError) {
    // Defensive: the validate middleware should catch ZodErrors first, but
    // any schema validated directly in a service lands here.
    statusCode = 400;
    message = "Validation failed";
    details = err.issues.map((i) => ({ path: i.path.join("."), message: i.message }));
    operational = true;
  } else if (err instanceof mongoose.Error.ValidationError) {
    statusCode = 400;
    message = "Validation failed";
    details = Object.values(err.errors).map((e) => ({ path: e.path, message: e.message }));
    operational = true;
  } else if (err instanceof mongoose.Error.CastError) {
    statusCode = 400;
    message = "Validation failed";
    details = [{ path: err.path, message: `Invalid value: ${String(err.value)}` }];
    operational = true;
  } else if ((err as { code?: number }).code === 11000) {
    statusCode = 409;
    const key = Object.keys((err as { keyValue?: Record<string, unknown> }).keyValue ?? {})[0] ?? "field";
    message = "Duplicate value";
    details = [{ path: key, message: `A record with this ${key} already exists` }];
    operational = true;
  } else if (bodyParserError(err)) {
    const bp = bodyParserError(err)!;
    statusCode = bp.statusCode;
    message = bp.message;
    operational = true;
  } else if (err instanceof Error && (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError")) {
    // Defensive: token.service wraps all jwt.verify failures into ApiError(401)
    // already, but a raw verify elsewhere would otherwise 500 here. Detected by
    // name because jsonwebtoken doesn't expose these classes as named ESM exports.
    statusCode = 401;
    message = "Invalid or expired token";
    operational = true;
  } else if (err instanceof Error) {
    // Non-operational errors are unexpected (DB driver, upstream JSON parse,
    // a thrown Error in a service) — never leak their internal message to
    // clients in production. The full message is still logged server-side.
    message = isProd ? message : err.message || message;
    operational = false;
  }

  // Apply any response headers carried by an ApiError (e.g. Retry-After).
  if (headers) {
    for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
  }

  const requestId = req.id;
  const logMeta = {
    requestId,
    method: req.method,
    url: req.originalUrl,
    error: err instanceof Error ? err.message : String(err),
    stack: isProd ? undefined : err instanceof Error ? err.stack : undefined,
  };

  if (statusCode >= 500) {
    logger.error(`${req.method} ${req.originalUrl} → ${statusCode}`, logMeta);
  } else if (!operational) {
    logger.warn(`${req.method} ${req.originalUrl} → ${statusCode}: ${message}`, logMeta);
  }
  // Operational 4xx (validation, auth, 404, rate-limit) are intentionally not
  // logged here — they are high-volume and would drown the signal. Morgan
  // already records each request line.

  res.status(statusCode).json({
    success: false,
    message,
    ...(details ? { errors: details } : {}),
    requestId,
    ...(isProd ? {} : { stack: err instanceof Error ? err.stack : undefined }),
  });
};