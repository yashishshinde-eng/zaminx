import { describe, it, expect } from "vitest";
import { ApiError } from "../../utils/ApiError.js";

describe("ApiError factories — status codes", () => {
  it.each([
    ["badRequest", 400],
    ["unauthorized", 401],
    ["forbidden", 403],
    ["notFound", 404],
    ["conflict", 409],
    ["payloadTooLarge", 413],
    ["tooManyRequests", 429],
    ["internal", 500],
    ["badGateway", 502],
    ["serviceUnavailable", 503],
    ["gatewayTimeout", 504],
  ] as const)("%s → %i", (factory, code) => {
    const err = (ApiError[factory] as (...a: unknown[]) => ApiError)();
    expect(err.statusCode).toBe(code);
    expect(err).toBeInstanceOf(Error);
  });
});

describe("ApiError — operational flag", () => {
  it("defaults to operational for client errors", () => {
    expect(ApiError.badRequest().isOperational).toBe(true);
    expect(ApiError.tooManyRequests().isOperational).toBe(true);
  });
  it("marks internal/badGateway/gatewayTimeout as non-operational", () => {
    expect(ApiError.internal().isOperational).toBe(false);
    expect(ApiError.badGateway().isOperational).toBe(false);
    expect(ApiError.gatewayTimeout().isOperational).toBe(false);
  });
});

describe("ApiError — rate-limit / unavailable headers", () => {
  it("tooManyRequests sets Cache-Control + Retry-After", () => {
    const err = ApiError.tooManyRequests("slow down", 60);
    expect(err.headers).toMatchObject({ "Cache-Control": "no-store", "Retry-After": "60" });
  });
  it("tooManyRequests omits Retry-After when none given", () => {
    const err = ApiError.tooManyRequests();
    expect(err.headers).toMatchObject({ "Cache-Control": "no-store" });
    expect(err.headers).not.toHaveProperty("Retry-After");
  });
  it("serviceUnavailable sets Cache-Control + Retry-After", () => {
    const err = ApiError.serviceUnavailable("be right back", 300);
    expect(err.headers).toMatchObject({ "Cache-Control": "no-store", "Retry-After": "300" });
  });
  it("carries details through", () => {
    const err = ApiError.badRequest("bad", [{ path: "x", message: "no" }]);
    expect(err.details).toEqual([{ path: "x", message: "no" }]);
  });
});