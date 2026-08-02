import os from "node:os";
import path from "node:path";

/**
 * Temp file through which globalSetup hands the test DB URI to the test files.
 * globalSetup writes either a reachable Mongo URI or an empty string (→ no DB,
 * integration tests skip). The db helper reads it synchronously at import so
 * `describe.skipIf(!hasTestDb)` can gate integration files at registration time.
 */
export const DB_URI_FILE = path.join(os.tmpdir(), "zaminex-test-db.uri");