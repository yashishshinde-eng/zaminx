import type { Server } from "node:http";
import { createApp } from "../app.js";
import { User, Package } from "../models/index.js";

/**
 * Phase 20 — HTTP + seed helpers for integration tests.
 *
 * One app instance is booted lazily on a random port (`listen(0)`) and reused
 * across the whole forked suite. `api()` returns the parsed JSON body + status
 * + headers so tests can assert on the standard `{success,message,data}` envelope
 * and on security headers.
 */
let server: Server | null = null;
let baseUrl = "";

async function boot(): Promise<string> {
  if (server) return baseUrl;
  const app = createApp();
  server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server!.once("listening", () => resolve()));
  const addr = server.address();
  const port = typeof addr === "object" && addr ? addr.port : 0;
  baseUrl = `http://127.0.0.1:${port}`;
  return baseUrl;
}

export interface ApiResponse<T = any> {
  status: number;
  body: T;
  headers: Headers;
}

export async function api<T = any>(p: string, init?: RequestInit): Promise<ApiResponse<T>> {
  const base = await boot();
  const headers: Record<string, string> = { "Content-Type": "application/json", ...(init?.headers as Record<string, string> | undefined) };
  const res = await fetch(base + p, { ...init, headers });
  const text = await res.text();
  let body: unknown = text ? JSON.parse(text) : {};
  return { status: res.status, body: body as T, headers: res.headers };
}

/** `api()` with a Bearer access token. */
export async function authed<T = any>(
  token: string,
  p: string,
  init?: RequestInit,
): Promise<ApiResponse<T>> {
  return api<T>(p, { ...init, headers: { Authorization: `Bearer ${token}`, ...(init?.headers as Record<string, string> | undefined) } });
}

export async function closeApi(): Promise<void> {
  if (!server) return;
  await new Promise<void>((resolve) => server!.close(() => resolve()));
  server = null;
}

/** Login via the API and return access + refresh tokens. */
export async function loginApi(
  email: string,
  password: string,
): Promise<{ accessToken: string; refreshToken: string }> {
  const r = await api<{ data: { tokens: { accessToken: string; refreshToken: string } } }>(
    "/api/v1/auth/login",
    { method: "POST", body: JSON.stringify({ email, password }) },
  );
  return r.body.data.tokens;
}

/** Seed an admin (directly, since /register only creates users) then log in. */
export async function seedAdminAndLogin(
  opts: { email?: string; password?: string } = {},
): Promise<{ accessToken: string; refreshToken: string; userId: string; email: string; password: string }> {
  const email = opts.email ?? `admin-${Math.random().toString(36).slice(2)}@test.local`;
  const password = opts.password ?? "secret123";
  const u = await User.create({ name: "Admin", email, password, role: "admin" });
  const tokens = await loginApi(email, password);
  return { ...tokens, userId: String(u._id), email, password };
}

/* ---- Seeds ---- */

export interface SeedUserOpts {
  name?: string;
  email?: string;
  password?: string;
  role?: "user" | "admin";
}
export async function seedUser(opts: SeedUserOpts = {}): Promise<{ _id: string; email: string; password: string; referralCode: string }> {
  const email = opts.email ?? `user-${Math.random().toString(36).slice(2)}@test.local`;
  const password = opts.password ?? "secret123";
  const u = await User.create({ name: opts.name ?? "Test User", email, password, role: opts.role ?? "user" });
  return { _id: String(u._id), email, password, referralCode: u.referralCode };
}

/** Seed a root referrer directly (bypasses the API, which now requires a
 *  referral code) so tests can register users under it. Returns its referral
 *  code. */
export async function seedRootReferrer(): Promise<{ _id: string; referralCode: string }> {
  const u = await User.create({
    name: "Root Referrer",
    email: `root-${Math.random().toString(36).slice(2)}@test.local`,
    password: "secret123",
  });
  return { _id: String(u._id), referralCode: u.referralCode };
}

/** Register via the API then login — returns access + refresh tokens for a fresh user.
 *  A referral code is compulsory at registration; when none is given, a root
 *  referrer is created on the fly to sponsor the new user. */
export async function registerAndLogin(
  creds: { name?: string; email?: string; password?: string; referralCode?: string } = {},
): Promise<{ accessToken: string; refreshToken: string; userId: string }> {
  const email = creds.email ?? `user-${Math.random().toString(36).slice(2)}@test.local`;
  const password = creds.password ?? "secret123";
  const referralCode = creds.referralCode ?? (await seedRootReferrer()).referralCode;
  const reg = await api<{ data: { user: { id: string }; tokens: { accessToken: string; refreshToken: string } } }>("/api/v1/auth/register", {
    method: "POST",
    body: JSON.stringify({ name: creds.name ?? "Test User", email, password, referralCode }),
  });
  if (reg.status !== 201) console.error("[DEBUG registerAndLogin]", reg.status, JSON.stringify(reg.body), "refCode=", referralCode);
  const { accessToken, refreshToken } = reg.body.data.tokens;
  return { accessToken, refreshToken, userId: reg.body.data.user.id };
}

export interface SeedPackageOpts {
  name?: string;
  priceUsd?: number;
  dailyReturnPct?: number;
  durationDays?: number;
}
export async function seedPackage(opts: SeedPackageOpts = {}): Promise<{ _id: string }> {
  const slug = `pkg-${Math.random().toString(36).slice(2)}`;
  const p = await Package.create({
    name: opts.name ?? "Starter",
    slug,
    priceUsd: opts.priceUsd ?? 100,
    dailyReturnPct: opts.dailyReturnPct ?? 1.5,
    // 0 = LIFETIME (no expiry) — the spec-aligned default.
    durationDays: opts.durationDays ?? 0,
    status: "active",
  });
  return { _id: String(p._id) };
}

/**
 * Fund a user's Main wallet via the decoupled wallet-deposit flow: POST
 * /payments/deposit (amount → sandbox invoice) → dev-simulate the paid webhook
 * → Main wallet credited. No package is created. When `token` is omitted a fresh
 * user is registered first. Returns the access token + the confirmed deposit id.
 */
export async function fundWallet(
  amount = 100,
  token?: string,
): Promise<{ accessToken: string; depositId: string }> {
  const accessToken = token ?? (await registerAndLogin()).accessToken;
  const dep = await authed<{ data: { deposit: { id: string } } }>(accessToken, "/api/v1/payments/deposit", {
    method: "POST",
    body: JSON.stringify({ amount }),
  });
  const id = dep.body.data.deposit.id;
  await authed(accessToken, `/api/v1/payments/dev/simulate/${id}`, { method: "POST" });
  return { accessToken, depositId: id };
}