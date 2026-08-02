import { setTimeout as sleep } from "node:timers/promises";

/**
 * Retry helper (Phase 19). Runs an async operation with exponential backoff +
 * jitter, retrying only transient failures (timeouts / 5xx / 429 / network
 * errors), never deterministic 4xx client errors. Used for idempotent gateway
 * reads (e.g. NOWPayments invoice-status lookups) so a transient blip is
 * absorbed within a single tick instead of waiting for the next scheduled run.
 *
 * IMPORTANT: never wrap a non-idempotent operation (e.g. `createInvoice`, a
 * POST) in `withRetry` — a retry could create a duplicate resource.
 */

export interface RetryOptions {
  /** Total attempts (1 = no retry). Default 3. */
  attempts?: number;
  /** First backoff delay. Default 500ms. */
  baseDelayMs?: number;
  /** Backoff cap. Default 8000ms. */
  maxDelayMs?: number;
  /** Predicate: should this thrown error be retried? Default `isTransientError`. */
  retryable?: (err: unknown) => boolean;
  /** Observability hook fired before each backoff sleep. */
  onRetry?: (info: { attempt: number; delayMs: number; error: unknown }) => void;
}

/** True for transient errors worth retrying: timeouts, 5xx, 429, and unknown
 * network errors. False for deterministic 4xx (and anything carrying a known
 * non-retryable status). Duck-typed so it works with `GatewayError` and raw
 * `Error`/`DOMException` alike — no import coupling. */
export function isTransientError(err: unknown): boolean {
  if (err == null) return false;
  const e = err as { name?: string; status?: number; isTimeout?: boolean };
  // Fetch AbortController timeout surfaces as a DOMException named "AbortError".
  if (e.name === "AbortError" || e.isTimeout) return true;
  if (typeof e.status === "number") return e.status >= 500 || e.status === 429;
  // No status → assume a network/transport error (ECONNRESET, ETIMEDOUT, …).
  // Treat as transient rather than failing a job on the first hiccup.
  return true;
}

/**
 * Run `fn`, retrying transient failures with exponential backoff + jitter.
 * Non-retryable errors (or exhaustion) rethrow the last error.
 */
export async function withRetry<T>(fn: () => Promise<T>, opts: RetryOptions = {}): Promise<T> {
  const attempts = opts.attempts ?? 3;
  const baseDelayMs = opts.baseDelayMs ?? 500;
  const maxDelayMs = opts.maxDelayMs ?? 8000;
  const retryable = opts.retryable ?? isTransientError;

  let lastErr: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt >= attempts || !retryable(err)) throw err;
      // Exponential backoff capped at maxDelayMs, with equal-jitter (delay/2..delay).
      const exp = baseDelayMs * 2 ** (attempt - 1);
      const capped = Math.min(maxDelayMs, exp);
      const delayMs = Math.round(capped * (0.5 + Math.random() * 0.5));
      opts.onRetry?.({ attempt, delayMs, error: err });
      await sleep(delayMs);
    }
  }
  throw lastErr;
}