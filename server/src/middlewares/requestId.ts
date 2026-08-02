import type { RequestHandler } from "express";
import crypto from "node:crypto";

// Make `req.id` visible to the rest of the server (errorHandler logs/returns it).
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      id: string;
    }
  }
}

const HEADER = "x-request-id";
const MAX_INCOMING_LEN = 128; // guard against absurd/abusive inbound header values

/**
 * Assigns a per-request correlation id (Phase 19). Honours an inbound
 * `X-Request-Id` (so an upstream gateway can propagate a trace), else mints a
 * UUID. The id is exposed on `req.id`, echoed back via the `X-Request-Id`
 * response header, and included in every error response body + log line by the
 * central error handler. Mounted first so it covers every response path.
 */
export const requestId: RequestHandler = (req, res, next) => {
  const inbound = req.headers[HEADER];
  const id =
    typeof inbound === "string" && inbound.length > 0 && inbound.length <= MAX_INCOMING_LEN
      ? inbound
      : crypto.randomUUID();
  req.id = id;
  res.setHeader(HEADER, id);
  next();
};