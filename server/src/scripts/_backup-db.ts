/** One-off: full EJSON backup of the current DB → backups/<timestamp>/.
 *  Each collection becomes <name>.json (EJSON, types preserved) plus an
 *  _manifest.json with doc counts + index definitions. Restore with
 *  _restore-db.ts <backupDir>. */
import "dotenv/config";
import mongoose from "mongoose";
import { EJSON } from "bson";
import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const BACKUP_ROOT = path.resolve(process.cwd(), "../backups");

async function main() {
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI not set");
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const dir = path.join(BACKUP_ROOT, `zaminex-${stamp}`);
  if (!existsSync(dir)) await mkdir(dir, { recursive: true });

  await mongoose.connect(process.env.MONGO_URI);
  const conn = mongoose.connection;
  const dbName = conn.db!.databaseName;
  console.log(`Backing up db "${dbName}" → ${dir}`);

  const cols = await conn.db!.collections();
  const manifest: { db: string; createdAt: string; collections: { name: string; docs: number; indexes: number }[] } = {
    db: dbName,
    createdAt: new Date().toISOString(),
    collections: [],
  };

  for (const col of cols) {
    const name = col.collectionName;
    const cursor = col.find({}, { batchSize: 500 });
    const parts: string[] = [];
    let docs = 0;
    let first = true;
    for await (const doc of cursor) {
      parts.push((first ? "[" : ",") + EJSON.stringify(doc, { relaxed: false }));
      first = false;
      if (parts.length >= 2000) {
        // flush chunk to keep memory bounded
        await writeFile(path.join(dir, `${name}.json.part${Math.floor(docs / 200)}`), parts.join(""));
        parts.length = 0;
      }
      docs++;
    }
    if (first) parts.push("[");
    parts.push("]");
    await writeFile(path.join(dir, `${name}.json`), parts.join(""));

    const indexes = await col.indexes();
    let idxCount = 0;
    if (docs > 0 || indexes.length > 1) {
      await writeFile(path.join(dir, `${name}.indexes.json`), JSON.stringify(indexes, null, 2));
      idxCount = indexes.length;
    }
    manifest.collections.push({ name, docs, indexes: idxCount });
    console.log(`  ${name}: ${docs} docs, ${idxCount} indexes`);
  }

  await writeFile(path.join(dir, "_manifest.json"), JSON.stringify(manifest, null, 2));
  console.log(`Backup complete: ${manifest.collections.length} collections, ${manifest.collections.reduce((s, c) => s + c.docs, 0)} docs total.`);
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});