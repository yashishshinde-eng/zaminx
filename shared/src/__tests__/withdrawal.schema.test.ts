import { describe, it, expect } from "vitest";
import {
  createWithdrawalSchema,
  adminActionSchema,
  withdrawalIdParamSchema,
  withdrawalListQuerySchema,
} from "../schemas/withdrawal.schema";

const body = (b: Record<string, unknown>) => ({ body: b });

describe("createWithdrawalSchema", () => {
  it("accepts a valid main-wallet withdrawal", () => {
    expect(createWithdrawalSchema.safeParse(body({ wallet: "main", amount: 50 })).success).toBe(true);
  });
  it("accepts bonus and trading wallets", () => {
    expect(createWithdrawalSchema.safeParse(body({ wallet: "bonus", amount: 10.5 })).success).toBe(true);
    expect(createWithdrawalSchema.safeParse(body({ wallet: "trading", amount: 1 })).success).toBe(true);
  });
  it("rejects an unknown wallet", () => {
    expect(createWithdrawalSchema.safeParse(body({ wallet: "savings", amount: 50 })).success).toBe(false);
  });
  it("rejects a non-positive amount", () => {
    expect(createWithdrawalSchema.safeParse(body({ wallet: "main", amount: 0 })).success).toBe(false);
    expect(createWithdrawalSchema.safeParse(body({ wallet: "main", amount: -5 })).success).toBe(false);
  });
  it("rejects a missing amount", () => {
    expect(createWithdrawalSchema.safeParse(body({ wallet: "main" })).success).toBe(false);
  });
});

describe("adminActionSchema", () => {
  it("accepts an optional remarks string", () => {
    expect(adminActionSchema.safeParse(body({ remarks: "ok" })).success).toBe(true);
    expect(adminActionSchema.safeParse(body({})).success).toBe(true);
  });
  it("rejects an over-long remarks", () => {
    expect(adminActionSchema.safeParse(body({ remarks: "x".repeat(501) })).success).toBe(false);
  });
});

describe("withdrawalIdParamSchema", () => {
  it("accepts a non-empty id", () => {
    expect(withdrawalIdParamSchema.safeParse({ params: { id: "abc123" }}).success).toBe(true);
  });
  it("rejects an empty id", () => {
    expect(withdrawalIdParamSchema.safeParse({ params: { id: "" }}).success).toBe(false);
  });
});

describe("withdrawalListQuerySchema", () => {
  it("defaults page/limit", () => {
    const r = withdrawalListQuerySchema.safeParse({ query: {} });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.query.page).toBe(1);
      expect(r.data.query.limit).toBe(20);
    }
  });
  it("accepts a valid status + paging", () => {
    expect(withdrawalListQuerySchema.safeParse({ query: { status: "approved", page: 2, limit: 5 }}).success).toBe(true);
  });
  it("rejects an invalid status", () => {
    expect(withdrawalListQuerySchema.safeParse({ query: { status: "nope" }}).success).toBe(false);
  });
  it("rejects limit > 50", () => {
    expect(withdrawalListQuerySchema.safeParse({ query: { limit: 51 }}).success).toBe(false);
  });
});