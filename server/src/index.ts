import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { connectDB } from "./config/db.js";
import { startScheduler, stopScheduler } from "./jobs/scheduler.js";

async function bootstrap() {
  await connectDB();
  if (env.CRON_ENABLED) startScheduler();

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info(`🚀 Zeminex API listening on http://localhost:${env.PORT}/api/v1`);
    logger.info(`📚 Swagger UI at http://localhost:${env.PORT}/api/docs`);
  });

  const shutdown = (signal: string) => {
    logger.info(`${signal} received — shutting down gracefully`);
    stopScheduler();
    server.close(() => {
      logger.info("HTTP server closed");
      process.exit(0);
    });
    // Force exit after 10s if connections hang.
    setTimeout(() => {
      logger.error("Forcing exit after shutdown timeout");
      process.exit(1);
    }, 10_000).unref();
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

bootstrap().catch((err) => {
  logger.error("Fatal bootstrap error", { error: err instanceof Error ? err.message : String(err) });
  process.exit(1);
});