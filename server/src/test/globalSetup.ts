import { config as dotenvConfig } from "dotenv";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";
import mongoose from "mongoose";
import { DB_URI_FILE } from "./paths.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenvConfig({ path: path.resolve(__dirname, "../../.env.test.local") });

/**
 * Phase 20 — vitest globalSetup. Runs once before the suite. Decides whether a
 * test DB is reachable and writes the URI (or empty) to `DB_URI_FILE`, which the
 * db helper reads synchronously to gate integration tests with `describe.skipIf`.
 *
 * No in-memory server dependency: the suite runs against a real Mongo given via
 * `TEST_MONGO_URI` (default: local `127.0.0.1:27017/zaminex_test`). When no Mongo
 * is reachable (CI without a DB service, or this sandbox) the probe fails fast
 * and integration tests skip — unit/shared/client tests still run green.
 */
async function probe(uri: string): Promise<boolean> {
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 4_000 });
    await mongoose.disconnect();
    return true;
  } catch {
    return false;
  }
}

export default async function globalSetup(): Promise<() => Promise<void>> {
  const uri = (process.env.TEST_MONGO_URI ?? "").trim();
  let reachable = false;
  if (uri) reachable = await probe(uri);
  fs.writeFileSync(DB_URI_FILE, reachable ? uri : "");
  // eslint-disable-next-line no-console
  console.log(
    reachable
      ? `[globalSetup] test DB reachable at ${uri}`
      : `[globalSetup] no test DB reachable — integration tests will skip`,
  );

  return async () => {
    try {
      fs.unlinkSync(DB_URI_FILE);
    } catch {
      /* already gone */
    }
  };
}