import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";
import mongoose from "mongoose";
import { ApiError } from "../utils/ApiError.js";
import { logger } from "../config/logger.js";
import { isProd } from "../config/env.js";

/** 404 handler — kept here too so routes can drop straight into it. */
export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
};

/** Centralised error handler — the last middleware in the chain. */
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  let statusCode = 500;
  let message = "Internal server error";
  let details: unknown | undefined;
  let operational = false;

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    details = err.details;
    operational = err.isOperational;
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
    message = `Invalid value for ${err.path}: ${err.value}`;
    operational = true;
  } else if ((err as { code?: number }).code === 11000) {
    statusCode = 409;
    const key = Object.keys((err as { keyValue?: Record<string, unknown> }).keyValue ?? {})[0] ?? "field";
    message = `Duplicate value for ${key}`;
    operational = true;
  } else if (err instanceof Error) {
    // Non-operational errors are unexpected (DB driver, upstream JSON parse,
    // a thrown Error in a service) — never leak their internal message to
    // clients in production. The full message is still logged server-side.
    message = isProd ? message : err.message || message;
    operational = false;
  }

  if (statusCode >= 500) {
    logger.error(`${req.method} ${req.originalUrl} → ${statusCode}`, {
      error: err instanceof Error ? err.message : String(err),
      stack: isProd ? undefined : err instanceof Error ? err.stack : undefined,
    });
  } else if (!operational) {
    logger.warn(`${req.method} ${req.originalUrl} → ${statusCode}: ${message}`);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(details ? { errors: details } : {}),
    ...(isProd ? {} : { stack: err instanceof Error ? err.stack : undefined }),
  });
};