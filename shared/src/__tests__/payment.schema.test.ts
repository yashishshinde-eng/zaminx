import { describe, it, expect } from "vitest";
import { depositIdParamSchema } from "../schemas/payment.schema";

describe("depositIdParamSchema", () => {
  it("accepts a non-empty id", () => {
    expect(depositIdParamSchema.safeParse({ params: { id: "507f1f77bcf86cd799439011" }}).success).toBe(true);
  });
  it("rejects an empty id", () => {
    expect(depositIdParamSchema.safeParse({ params: { id: "" }}).success).toBe(false);
  });
  it("trims whitespace before validating", () => {
    expect(depositIdParamSchema.safeParse({ params: { id: "  abc  " }}).success).toBe(true);
  });
});