import type { IncomingMessage, ServerResponse } from "node:http";
import { connectDB } from "../../server/src/config/db.js";
import { runDueJobs } from "../../server/src/jobs/scheduler.js";

/**
 * Vercel-Cron target. A single every-15-minutes schedule fires this endpoint;
 * the existing scheduler pass (runDueJobs -> tick -> isDue) decides which of
 * the 6 enabled jobs are actually due and runs them. Jobs are idempotent per
 * period (ledger-reference dedupe) and CronLog-guarded, so over-firing is safe.
 */
export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  // Auth: prefer CRON_SECRET (passed via the cron `path` query string, since the
  // crons config can't inject a custom header). Fall back to Vercel's documented
  // `vercel-cron/1.0` user-agent marker when no secret is configured.
  const url = new URL(req.url ?? "/", "http://localhost");
  const secret = process.env.CRON_SECRET;
  const ua = req.headers["user-agent"];
  const fromVercelCron = typeof ua === "string" && ua.includes("vercel-cron");
  const secretOk = !secret || url.searchParams.get("secret") === secret;
  if (!secretOk || (!secret && !fromVercelCron)) {
    res.statusCode = 401;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ ok: false, error: "unauthorized" }));
    return;
  }

  try {
    await connectDB();
    await runDueJobs();
    res.statusCode = 200;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ ok: true }));
  } catch (err) {
    res.statusCode = 500;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ ok: false, error: (err as Error).message }));
  }
}