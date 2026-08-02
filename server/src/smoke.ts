// Phase 2 smoke test — exercises the Express app.
// Non-DB endpoints always run. CMS/page/contact checks require MongoDB; if a
// short connection attempt fails, those are skipped with a note (and the
// smoke test still validates the rest). Run: npx tsx src/smoke.ts  (from server/)
import mongoose from "mongoose";
import { createApp } from "./app.js";
import { CmsPage } from "./models/index.js";
import { env } from "./config/env.js";

const app = createApp();

async function tryConnectMongo(): Promise<boolean> {
  try {
    await mongoose.connect(env.MONGO_URI, { serverSelectionTimeoutMS: 2000 });
    return true;
  } catch {
    return false;
  }
}

const TEST_PAGE = {
  slug: "smoke-about",
  title: "Smoke About",
  status: "published",
  publishedAt: new Date(),
  seo: { title: "About — smoke", description: "smoke desc" },
  blocks: [{ type: "heading", level: 1, text: "About" }],
};

const server = app.listen(0, async () => {
  const port = (server.address() as { port: number }).port;
  const base = `http://localhost:${port}`;
  let failures = 0;

  const check = async (name: string, url: string, init: RequestInit, expect: { status: number; bodyMatch?: unknown }) => {
    try {
      const res = await fetch(base + url, init);
      const contentType = res.headers.get("content-type") ?? "";
      const isJson = contentType.includes("application/json");
      const body = isJson ? JSON.stringify(await res.json().catch(() => null)) : await res.text();
      const okStatus = res.status === expect.status;
      const okBody = expect.bodyMatch === undefined || body.includes(String(expect.bodyMatch));
      console.log(`${okStatus && okBody ? "✓" : "✗"} ${name} → ${res.status} (expected ${expect.status})`);
      if (!okStatus || !okBody) {
        failures++;
        console.log("   body:", body.slice(0, 300));
      }
    } catch (e) {
      console.log(`✗ ${name} threw: ${(e as Error).message}`);
      failures++;
    }
  };

  // --- Always-on (no DB) checks ---
  await check("health", "/api/v1/health", { method: "GET" }, { status: 200, bodyMatch: "ok" });
  await check("swagger ui", "/api/docs", { method: "GET" }, { status: 200, bodyMatch: "swagger" });
  await check("404 route", "/api/v1/nope", { method: "GET" }, { status: 404, bodyMatch: "Route not found" });
  await check("unauthorized /me", "/api/v1/auth/me", { method: "GET" }, { status: 401, bodyMatch: "Missing access token" });
  await check("unauthorized /dashboard/summary", "/api/v1/dashboard/summary", { method: "GET" }, { status: 401, bodyMatch: "Missing access token" });
  await check("unauthorized /profile", "/api/v1/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "x" }) }, { status: 401, bodyMatch: "Missing access token" });
  await check("unauthorized /packages", "/api/v1/packages", { method: "GET" }, { status: 401, bodyMatch: "Missing access token" });
  await check("unauthorized /packages/activate", "/api/v1/packages/activate", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ packageId: "507f1f77bcf86cd799439011" }),
  }, { status: 401, bodyMatch: "Missing access token" });
  await check("unauthorized /wallet", "/api/v1/wallet", { method: "GET" }, { status: 401, bodyMatch: "Missing access token" });
  await check("unauthorized /withdrawals", "/api/v1/withdrawals", { method: "GET" }, { status: 401, bodyMatch: "Missing access token" });
  await check("unauthorized /withdrawals submit", "/api/v1/withdrawals", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ wallet: "main", amount: 50 }),
  }, { status: 401, bodyMatch: "Missing access token" });
  await check("unauthorized /payments/deposits", "/api/v1/payments/deposits", { method: "GET" }, { status: 401, bodyMatch: "Missing access token" });
  await check("unauthorized /referrals/me", "/api/v1/referrals/me", { method: "GET" }, { status: 401, bodyMatch: "Missing access token" });
  await check("unauthorized /referrals/direct", "/api/v1/referrals/direct", { method: "GET" }, { status: 401, bodyMatch: "Missing access token" });
  await check("unauthorized /referrals/children", "/api/v1/referrals/children/me", { method: "GET" }, { status: 401, bodyMatch: "Missing access token" });
  await check("unauthorized /bonanzas", "/api/v1/bonanzas", { method: "GET" }, { status: 401, bodyMatch: "Missing access token" });
  await check("unauthorized /compensation/run-yield", "/api/v1/compensation/run-yield", { method: "POST" }, { status: 401, bodyMatch: "Missing access token" });
  await check("payments webhook ack", "/api/v1/payments/nowpayments/webhook", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: "no-such-invoice" }),
  }, { status: 200, bodyMatch: "received" });
  await check("register validation", "/api/v1/auth/register", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "bad" }),
  }, { status: 400, bodyMatch: "Validation failed" });
  await check("login validation", "/api/v1/auth/login", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}),
  }, { status: 400, bodyMatch: "Validation failed" });
  await check("verify-email validation", "/api/v1/auth/verify-email", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}),
  }, { status: 400, bodyMatch: "Validation failed" });

  // --- DB-dependent CMS checks (skipped without MongoDB) ---
  const connected = await tryConnectMongo();
  if (!connected) {
    console.log("ⓘ MongoDB not reachable — skipping CMS/page/contact checks (they need a DB).");
  } else {
    await CmsPage.create(TEST_PAGE).catch(() => undefined); // ignore if already present
    await check("resend-verification no-leak", "/api/v1/auth/resend-verification", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "no-such-account@example.com" }),
    }, { status: 200, bodyMatch: "If that email exists" });
    await check("verify-email invalid token", "/api/v1/auth/verify-email", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: "definitely-not-a-real-token" }),
    }, { status: 400, bodyMatch: "Invalid verification token" });
    await check("cms site", "/api/v1/cms/site", { method: "GET" }, { status: 200, bodyMatch: "maintenanceMode" });
    await check("cms page list", "/api/v1/cms/pages", { method: "GET" }, { status: 200, bodyMatch: "slug" });
    await check("cms page by slug", `/api/v1/cms/pages/${TEST_PAGE.slug}`, { method: "GET" }, { status: 200, bodyMatch: "blocks" });
    await check("cms page missing", "/api/v1/cms/pages/does-not-exist", { method: "GET" }, { status: 404, bodyMatch: "Page not found" });
    await check("contact valid", "/api/v1/cms/contact", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Jane", email: "jane@example.com", message: "Hello from smoke test" }),
    }, { status: 201, bodyMatch: "received" });
    await check("contact invalid", "/api/v1/cms/contact", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "J" }),
    }, { status: 400, bodyMatch: "Validation failed" });
    await CmsPage.deleteOne({ slug: TEST_PAGE.slug }).catch(() => undefined);
    await mongoose.disconnect().catch(() => undefined);
  }

  console.log(failures === 0 ? "\n✅ All smoke checks passed" : `\n❌ ${failures} check(s) failed`);
  server.close();
  process.exit(failures === 0 ? 0 : 1);
});

server.on("error", (e) => {
  console.error("Server error:", e);
  process.exit(1);
});