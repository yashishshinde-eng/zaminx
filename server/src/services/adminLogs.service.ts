import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import readline from "node:readline";
import type { AdminLogFile, AdminLogsQuery, AdminLogsResult } from "@zeminex/shared";

/** Winston writes to `<cwd>/logs/<file>.log` (prod only). */
const LOG_DIR = path.resolve(process.cwd(), "logs");

function logPath(file: AdminLogFile): string {
  return path.join(LOG_DIR, `${file}.log`);
}

/**
 * Read the last `lines` lines of a Winston log file by streaming it once and
 * keeping an in-memory ring of the tail — avoids loading a huge file into
 * memory. Returns `exists:false` when the file isn't present (dev mode has no
 * file transport). `file` is enum-validated upstream, so there's no path
 * traversal risk.
 */
export async function readLogTail(query: AdminLogsQuery): Promise<AdminLogsResult> {
  const file = query.file;
  const want = query.lines;
  const filePath = logPath(file);

  try {
    await stat(filePath);
  } catch {
    return { file, exists: false, lines: [], truncated: false };
  }

  const ring: string[] = [];
  let total = 0;
  const stream = createReadStream(filePath, { encoding: "utf8" });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
  for await (const line of rl) {
    total += 1;
    ring.push(line);
    if (ring.length > want) ring.shift();
  }
  return { file, exists: true, lines: ring, truncated: total > ring.length };
}