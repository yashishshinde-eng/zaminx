import { describe, it, expect } from "vitest";
import { withRetry, isTransientError } from "../../utils/retry.js";

describe("isTransientError", () => {
  it("retries 5xx and 429", () => {
    expect(isTransientError({ status: 500 })).toBe(true);
    expect(isTransientError({ status: 503 })).toBe(true);
    expect(isTransientError({ status: 429 })).toBe(true);
  });
  it("does not retry 4xx (except 429)", () => {
    expect(isTransientError({ status: 400 })).toBe(false);
    expect(isTransientError({ status: 404 })).toBe(false);
    expect(isTransientError({ status: 401 })).toBe(false);
  });
  it("retries AbortError-named + isTimeout errors", () => {
    expect(isTransientError({ name: "AbortError" })).toBe(true);
    expect(isTransientError({ isTimeout: true })).toBe(true);
  });
  it("treats unknown/network errors as transient", () => {
    expect(isTransientError(new Error("ECONNRESET"))).toBe(true);
    expect(isTransientError(null)).toBe(false);
  });
});

describe("withRetry", () => {
  it("resolves on the first try without sleeping", async () => {
    let calls = 0;
    const r = await withRetry(async () => {
      calls += 1;
      return "ok";
    }, { baseDelayMs: 1, maxDelayMs: 2 });
    expect(r).toBe("ok");
    expect(calls).toBe(1);
  });

  it("retries transient failures until success", async () => {
    let calls = 0;
    const r = await withRetry(
      async () => {
        calls += 1;
        if (calls < 3) throw { status: 503 };
        return "recovered";
      },
      { attempts: 5, baseDelayMs: 1, maxDelayMs: 2 },
    );
    expect(r).toBe("recovered");
    expect(calls).toBe(3);
  });

  it("does NOT retry a non-transient (4xx) error", async () => {
    let calls = 0;
    await expect(
      withRetry(
        async () => {
          calls += 1;
          throw { status: 400 };
        },
        { attempts: 5, baseDelayMs: 1 },
      ),
    ).rejects.toMatchObject({ status: 400 });
    expect(calls).toBe(1);
  });

  it("rethrows the last error on exhaustion", async () => {
    let calls = 0;
    await expect(
      withRetry(
        async () => {
          calls += 1;
          throw { status: 503 };
        },
        { attempts: 2, baseDelayMs: 1, maxDelayMs: 2 },
      ),
    ).rejects.toMatchObject({ status: 503 });
    expect(calls).toBe(2);
  });

  it("honors a custom retryable predicate", async () => {
    let calls = 0;
    await expect(
      withRetry(
        async () => {
          calls += 1;
          throw new Error("nope");
        },
        { attempts: 3, baseDelayMs: 1, maxDelayMs: 2, retryable: () => false },
      ),
    ).rejects.toThrow("nope");
    expect(calls).toBe(1);
  });

  it("fires the onRetry hook before each backoff", async () => {
    const events: number[] = [];
    await withRetry(
      async () => {
        throw { status: 500 };
      },
      { attempts: 3, baseDelayMs: 1, maxDelayMs: 2, onRetry: (info) => events.push(info.attempt) },
    ).catch(() => {});
    expect(events).toEqual([1, 2]);
  });
});