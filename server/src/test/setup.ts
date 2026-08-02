import { config as dotenvConfig } from "dotenv";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Phase 20 — vitest setupFile (runs before each test file's imports evaluate).
 *
 * Loads gitignored `server/.env.test.local` first (dotenv never overrides vars
 * already on the process, so `TEST_MONGO_URI="" npm test` forces the no-DB skip
 * path). Then sets every env var `config/env.ts` requires at import time, so
 * importing the app/services never `process.exit(1)`s the test run. These run
 * BEFORE any `import { env } from "../config/env.js"` resolves the frozen `env`.
 */
dotenvConfig({ path: path.resolve(__dirname, "../../.env.test.local") });

process.env.NODE_ENV ??= "test";
// Placeholder for validation only — real test DB is connected by `connectTestDb`
// using the URI globalSetup probed (TEST_MONGO_URI). The app never connects to it
// because tests use `createApp()` (not `index.ts`), which has no DB bootstrap.
process.env.MONGO_URI ??= "mongodb://127.0.0.1:27017/zaminex_test";
process.env.JWT_ACCESS_SECRET ??= "test-access-secret-aaaaaaaaaaaaaaaaaaaaa";
process.env.JWT_REFRESH_SECRET ??= "test-refresh-secret-bbbbbbbbbbbbbbbbbbbbb";
process.env.SEED_ADMIN_PASSWORD ??= "test-admin-password";
process.env.CLIENT_URL ??= "http://localhost:5173";
process.env.CRON_ENABLED ??= "false";
// NOWPAYMENTS_* intentionally unset → sandbox payment path, no gateway calls.