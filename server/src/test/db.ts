import mongoose from "mongoose";
import fs from "node:fs";
import { DB_URI_FILE } from "./paths.js";

/**
 * Read once at import (after globalSetup wrote the file). Integration test files
 * use `describe.skipIf(!hasTestDb)` so they register as skipped — not failed —
 * when no Mongo is reachable.
 */
export const hasTestDb =
  fs.existsSync(DB_URI_FILE) && fs.readFileSync(DB_URI_FILE, "utf8").trim().length > 0;

let connected = false;

/** Connect the global mongoose singleton (used by every service) to the test DB. */
export async function connectTestDb(): Promise<void> {
  if (connected) return;
  const uri = fs.readFileSync(DB_URI_FILE, "utf8").trim();
  if (!uri) throw new Error("connectTestDb called with no reachable test DB");
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5_000 });
  connected = true;
}

/** Drop every collection between tests for isolation. Cheaper than reconnect. */
export async function clearDb(): Promise<void> {
  if (!connected) return;
  await mongoose.connection.db!.dropDatabase();
}

export async function disconnectTestDb(): Promise<void> {
  if (!connected) return;
  await mongoose.disconnect();
  connected = false;
}