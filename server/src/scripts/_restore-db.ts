/** One-off: restore a backup produced by _backup-db.ts.
 *  Usage: npx tsx src/scripts/_restore-db.ts <backupDir> [--no-drop]
 *  For each <collection>.json in the dir: drops the collection (unless
 *  --no-drop), recreates its indexes from <collection>.indexes.json, then
 *  inserts the EJSON docs back (ObjectId/Date/binary all restored). */
import "dotenv/config";
import mongoose from "mongoose";
import { EJSON } from "bson";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

async function main() {
  const dir = process.argv[2];
  const drop = !process.argv.includes("--no-drop");
  if (!dir) throw new Error("Usage: npx tsx src/scripts/_restore-db.ts <backupDir> [--no-drop]");
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI not set");

  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db!;
  const files = (await readdir(dir)).filter((f) => f.endsWith(".json") && !f.endsWith(".indexes.json") && f !== "_manifest.json" && !f.includes(".part"));
  console.log(`Restoring ${files.length} collection(s) from ${dir} into db "${db.databaseName}" ${drop ? "(drop mode)" : "(no-drop mode)"}`);

  for (const file of files) {
    const name = path.basename(file, ".json");
    const raw = await readFile(path.join(dir, file), "utf8");
    const docs = EJSON.parse(raw) as Record<string, unknown>[];
    if (docs.length === 0) {
      console.log(`  ${name}: empty, skipping`);
      continue;
    }
    if (drop) await db.dropCollection(name).catch(() => {});
    const idxRaw = await readFile(path.join(dir, `${name}.indexes.json`), "utf8").catch(() => null);
    if (idxRaw) {
      const indexes = JSON.parse(idxRaw) as { key: Record<string, unknown>; name: string; [k: string]: unknown }[];
      for (const idx of indexes) {
        if (idx.name === "_id_") continue;
        await db.createIndex(name, idx.key as never, { ...idx, key: undefined } as never).catch((e) =>
          console.log(`  ${name}: index ${idx.name} failed: ${e.message}`),
        );
      }
    }
    for (let i = 0; i < docs.length; i += 1000) {
      await db.collection(name).insertMany(docs.slice(i, i + 1000) as never[], { ordered: false });
    }
    console.log(`  ${name}: ${docs.length} docs restored`);
  }

  console.log("Restore complete.");
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});