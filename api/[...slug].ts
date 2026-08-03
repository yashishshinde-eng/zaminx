import type { IncomingMessage, ServerResponse } from "node:http";
import { createApp } from "../server/src/app.js";
import { connectDB } from "../server/src/config/db.js";

// Build the Express app once per cold start. The same app handles every
// /api/* path (Express routes /api/v1 and /api/docs internally); the catch-all
// [...slug] route keeps Vercel from needing a per-route file.
const app = createApp();

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  // Cached after the first call (globalThis.__mongooseConn) — instant on warm
  // invocations, one real connect per cold start.
  await connectDB();
  (app as unknown as (r: IncomingMessage, s: ServerResponse) => void)(req, res);
}