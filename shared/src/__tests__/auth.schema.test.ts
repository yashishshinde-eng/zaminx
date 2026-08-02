import { describe, it, expect } from "vitest";
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  verifyEmailSchema,
} from "../schemas/auth.schema";

/** Wrap a body in the `{ body }` envelope these request schemas expect. */
const body = (b: Record<string, unknown>) => ({ body: b });

describe("registerSchema", () => {
  it("accepts a valid registration", () => {
    const r = registerSchema.safeParse(body({ name: "Ada", email: "ADA@Example.com", password: "secret123" }));
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.body.email).toBe("ada@example.com"); // trimmed + lowercased
      expect(r.data.body.name).toBe("Ada");
    }
  });

  it("rejects a too-short name", () => {
    expect(registerSchema.safeParse(body({ name: "A", email: "a@b.com", password: "secret123" })).success).toBe(false);
  });

  it("rejects an invalid email", () => {
    expect(registerSchema.safeParse(body({ name: "Ada", email: "not-an-email", password: "secret123" })).success).toBe(false);
  });

  it("rejects a password without a digit", () => {
    expect(registerSchema.safeParse(body({ name: "Ada", email: "a@b.com", password: "secretonly" })).success).toBe(false);
  });

  it("rejects a password without a letter", () => {
    expect(registerSchema.safeParse(body({ name: "Ada", email: "a@b.com", password: "12345678" })).success).toBe(false);
  });

  it("rejects a password shorter than 8 chars", () => {
    expect(registerSchema.safeParse(body({ name: "Ada", email: "a@b.com", password: "ab1" })).success).toBe(false);
  });

  it("treats empty optional strings as undefined", () => {
    const r = registerSchema.safeParse(body({ name: "Ada", email: "a@b.com", password: "secret123", phone: "", referralCode: "" }));
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.body.phone).toBeUndefined();
      expect(r.data.body.referralCode).toBeUndefined();
    }
  });
});

describe("loginSchema", () => {
  it("accepts valid credentials", () => {
    expect(loginSchema.safeParse(body({ email: "A@B.com", password: "anything" })).success).toBe(true);
  });
  it("requires a password", () => {
    expect(loginSchema.safeParse(body({ email: "a@b.com", password: "" })).success).toBe(false);
  });
  it("rejects a bad email", () => {
    expect(loginSchema.safeParse(body({ email: "nope", password: "x" })).success).toBe(false);
  });
});

describe("forgotPasswordSchema", () => {
  it("accepts an email", () => {
    expect(forgotPasswordSchema.safeParse(body({ email: "a@b.com" })).success).toBe(true);
  });
  it("rejects a non-email", () => {
    expect(forgotPasswordSchema.safeParse(body({ email: "nope" })).success).toBe(false);
  });
});

describe("resetPasswordSchema", () => {
  it("accepts token + strong password", () => {
    expect(resetPasswordSchema.safeParse(body({ token: "abc", password: "secret123" })).success).toBe(true);
  });
  it("requires a token", () => {
    expect(resetPasswordSchema.safeParse(body({ token: "", password: "secret123" })).success).toBe(false);
  });
  it("rejects a weak password", () => {
    expect(resetPasswordSchema.safeParse(body({ token: "abc", password: "weak" })).success).toBe(false);
  });
});

describe("changePasswordSchema", () => {
  it("accepts current + new strong password", () => {
    expect(changePasswordSchema.safeParse(body({ currentPassword: "old12345", password: "new12345" })).success).toBe(true);
  });
  it("requires currentPassword", () => {
    expect(changePasswordSchema.safeParse(body({ password: "new12345" })).success).toBe(false);
  });
});

describe("verifyEmailSchema", () => {
  it("accepts a token", () => {
    expect(verifyEmailSchema.safeParse(body({ token: "abc" })).success).toBe(true);
  });
  it("requires a token", () => {
    expect(verifyEmailSchema.safeParse(body({ token: "" })).success).toBe(false);
  });
});