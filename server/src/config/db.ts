import mongoose from "mongoose";
import { env } from "./env.js";
import { logger } from "./logger.js";

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 2000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function connectDB(): Promise<typeof mongoose> {
  let attempt = 0;

  // Cleaner Mongoose logs in dev.
  mongoose.set("strictQuery", true);

  while (attempt < MAX_RETRIES) {
    attempt += 1;
    try {
      logger.info(`Connecting to MongoDB (attempt ${attempt}/${MAX_RETRIES})…`);
      const conn = await mongoose.connect(env.MONGO_URI);
      logger.info(`✅ MongoDB connected: ${conn.connection.host}:${conn.connection.port}/${conn.connection.name}`);
      return conn;
    } catch (err) {
      logger.error(`MongoDB connection failed`, { error: (err as Error).message });
      if (attempt >= MAX_RETRIES) {
        logger.error("Max MongoDB connection retries reached — exiting.");
        process.exit(1);
      }
      await sleep(RETRY_DELAY_MS);
    }
  }
  // Unreachable, but satisfies TS.
  throw new Error("MongoDB connection failed");
}