// Phase 1 smoke test — exercises the Express app without MongoDB.
// Run: npx tsx src/smoke.ts  (from server/)
import { createApp } from "./app.js";

const app = createApp();
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

  await check("health", "/api/v1/health", { method: "GET" }, { status: 200, bodyMatch: "ok" });
  await check("swagger ui", "/api/docs", { method: "GET" }, { status: 200, bodyMatch: "swagger" });
  await check("404 route", "/api/v1/nope", { method: "GET" }, { status: 404, bodyMatch: "Route not found" });
  await check("unauthorized /me", "/api/v1/auth/me", { method: "GET" }, { status: 401, bodyMatch: "Missing access token" });
  await check(
    "validation error",
    "/api/v1/auth/register",
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "bad" }) },
    { status: 400, bodyMatch: "Validation failed" },
  );
  await check(
    "missing fields",
    "/api/v1/auth/login",
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) },
    { status: 400, bodyMatch: "Validation failed" },
  );

  console.log(failures === 0 ? "\n✅ All smoke checks passed" : `\n❌ ${failures} check(s) failed`);
  server.close();
  process.exit(failures === 0 ? 0 : 1);
});

server.on("error", (e) => {
  console.error("Server error:", e);
  process.exit(1);
});