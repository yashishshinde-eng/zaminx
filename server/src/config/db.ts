import mongoose from "mongoose";
import { env } from "./env.js";
import { logger } from "./logger.js";

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 2000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Cache the connect promise on `globalThis` so warm serverless invocations
 * reuse a single Mongoose connection instead of reconnecting on every request.
 * On long-running hosts (local dev) the first call sets this and `index.ts`
 * awaits it at boot — behavior is unchanged there.
 */
declare global {
  // eslint-disable-next-line no-var
  var __mongooseConn: Promise<typeof mongoose> | undefined;
}

export async function connectDB(): Promise<typeof mongoose> {
  if (globalThis.__mongooseConn) return globalThis.__mongooseConn;

  // Cleaner Mongoose logs in dev.
  mongoose.set("strictQuery", true);

  globalThis.__mongooseConn = (async () => {
    let attempt = 0;
    while (attempt < MAX_RETRIES) {
      attempt += 1;
      try {
        logger.info(`Connecting to MongoDB (attempt ${attempt}/${MAX_RETRIES})…`);
        const conn = await mongoose.connect(env.MONGO_URI, {
          // Avoid buffering requests while connections are establishing on
          // cold serverless starts; surface connection errors immediately.
          bufferCommands: false,
          serverSelectionTimeoutMS: 10_000,
        });
        logger.info(
          `✅ MongoDB connected: ${conn.connection.host}:${conn.connection.port}/${conn.connection.name}`,
        );
        return conn;
      } catch (err) {
        logger.error(`MongoDB connection failed`, { error: (err as Error).message });
        if (attempt >= MAX_RETRIES) {
          // Invalidate the cache so the next invocation can retry from scratch
          // instead of reusing a rejected promise.
          globalThis.__mongooseConn = undefined;
          // Throw (do NOT process.exit) — on a serverless host the function
          // should return a 500 and let Vercel start a fresh instance.
          throw new Error(`MongoDB connection failed: ${(err as Error).message}`);
        }
        await sleep(RETRY_DELAY_MS);
      }
    }
    throw new Error("MongoDB connection failed");
  })();

  return globalThis.__mongooseConn;
}