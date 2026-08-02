import express, { type Express } from "express";
import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";
import { env, isProd } from "./config/env.js";
import { stream } from "./config/logger.js";
import { swaggerSpec } from "./config/swagger.js";
import { apiLimiter } from "./middlewares/rateLimit.js";
import { enforceMaintenance } from "./middlewares/maintenance.js";
import { requestId } from "./middlewares/requestId.js";
import { notFoundHandler, errorHandler } from "./middlewares/error.js";
import v1Router from "./routes/index.js";

export function createApp(): Express {
  const app = express();

  // `req.ip` (rate-limit keys, audit `meta.ip`) must reflect the real client
  // when behind a reverse proxy; 0 = trust none (dev/standalone, unchanged).
  app.set("trust proxy", env.TRUST_PROXY);

  // Correlation id — mounted first so it covers every response path, including
  // errors. Sets `req.id` + the `X-Request-Id` response header.
  app.use(requestId);

  // --- Security & parsing ---
  app.use(helmet());
  app.use(
    cors({
      origin: env.CLIENT_URL,
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    }),
  );
  app.use(compression());
  app.use(
    express.json({
      limit: "1mb",
      // Capture the raw body so the NOWPayments IPN webhook can verify the
      // HMAC-SHA512 signature over the exact bytes received.
      verify: (req, _res, buf) => {
        // `req` here is the raw IncomingMessage, not the augmented Express
        // Request — cast to assign the captured raw body for webhook signing.
        (req as unknown as { rawBody?: Buffer }).rawBody = buf;
      },
    }),
  );
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // --- Request logging ---
  app.use(morgan(isProd ? "combined" : "dev", { stream }));

  // --- API documentation ---
  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  // --- Rate limit + maintenance gate + routes ---
  // `enforceMaintenance` runs before the sub-routers: when maintenance is on,
  // non-admin API requests 503 (auth login/refresh/logout bypass so an admin
  // can get back in). When the DB is unreachable maintenance reads as off, so
  // existing auth/401 behaviour is unchanged.
  app.use("/api/v1", apiLimiter, enforceMaintenance, v1Router);

  // --- 404 + error handler (must be last) ---
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}