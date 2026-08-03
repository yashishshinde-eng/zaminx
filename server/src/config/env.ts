import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(5000),
  CLIENT_URL: z.string().url().default("http://localhost:5173"),
  MONGO_URI: z.string().min(1, { message: "MONGO_URI is required" }),

  JWT_ACCESS_SECRET: z.string().min(32, { message: "JWT_ACCESS_SECRET must be >= 32 chars" }),
  JWT_REFRESH_SECRET: z.string().min(32, { message: "JWT_REFRESH_SECRET must be >= 32 chars" }),
  JWT_ACCESS_EXPIRY: z.string().default("15m"),
  JWT_REFRESH_EXPIRY: z.string().default("7d"),

  SEED_ADMIN_NAME: z.string().default("Platform Admin"),
  SEED_ADMIN_EMAIL: z.string().email().default("admin@zaminex.local"),
  // No default — a known-default seed password must never create a prod admin.
  SEED_ADMIN_PASSWORD: z.string().min(8, { message: "SEED_ADMIN_PASSWORD is required" }),

  // Email delivery (Phase 3). In dev, omit SMTP_* to fall back to a file
  // transport that writes each message under server/logs/emails/.
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().default("Zaminex <noreply@zaminex.io>"),
  EMAIL_TOKEN_EXPIRY_HOURS: z.coerce.number().int().positive().default(24),

  // NOWPayments deposit gateway (Phase 7). When API_KEY + IPN_SECRET are both
  // set, activation calls the live gateway and webhooks are signature-verified.
  // When unset, a sandbox/mock path is used so the full flow runs locally.
  NOWPAYMENTS_API_KEY: z.string().optional(),
  NOWPAYMENTS_IPN_SECRET: z.string().optional(),
  NOWPAYMENTS_BASE_URL: z.string().url().default("https://api.nowpayments.io/v1"),
  NOWPAYMENTS_PAY_CURRENCY: z.string().default("usdtbsc"), // USDT on BNB Smart Chain

  // In-process scheduler (Phase 18). Disable to run a worker that shouldn't fire
  // jobs (e.g. a dedicated API-only instance) while the schema keeps compiling.
  // On Vercel this is false (Vercel Cron owns scheduling via /api/cron/tick).
  CRON_ENABLED: z.coerce.boolean().default(true),

  // Shared secret that gates the /api/cron/tick Vercel-Cron endpoint. Optional:
  // when unset the cron handler falls back to Vercel's `vercel-cron` user-agent
  // marker. Set on Vercel and mirror it into the cron `path` query string.
  CRON_SECRET: z.string().optional(),

  // Trust the first N proxy hops for `req.ip` / X-Forwarded-For (Phase 19).
  // 0 = trust none (default; dev/standalone). Set to 1+ behind a reverse proxy
  // so rate-limit keys and audit `meta.ip` reflect the real client, not the proxy.
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error("❌ Invalid environment variables:\n", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === "production";
export const isDev = env.NODE_ENV === "development";

/** True when NOWPayments credentials are configured (live gateway + signed webhooks). */
export const isNowpaymentsConfigured = () =>
  Boolean(env.NOWPAYMENTS_API_KEY && env.NOWPAYMENTS_IPN_SECRET);