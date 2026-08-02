import { describe, it, expect } from "vitest";
import { activatePackageSchema } from "../schemas/package.schema";

const body = (b: Record<string, unknown>) => ({ body: b });
const HEX24 = "507f1f77bcf86cd799439011";

describe("activatePackageSchema", () => {
  it("accepts a valid 24-hex package id", () => {
    expect(activatePackageSchema.safeParse(body({ packageId: HEX24 })).success).toBe(true);
  });
  it("accepts uppercase hex too", () => {
    expect(activatePackageSchema.safeParse(body({ packageId: "A".repeat(24) })).success).toBe(true);
  });
  it("rejects a non-hex id", () => {
    expect(activatePackageSchema.safeParse(body({ packageId: "z".repeat(24) })).success).toBe(false);
  });
  it("rejects a too-short id", () => {
    expect(activatePackageSchema.safeParse(body({ packageId: "abc123" })).success).toBe(false);
  });
  it("rejects a missing packageId", () => {
    expect(activatePackageSchema.safeParse(body({})).success).toBe(false);
  });
});