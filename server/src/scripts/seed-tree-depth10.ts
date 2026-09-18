/**
 * Generate a full 3-ary referral tree of depth 10 (88,573 users) — grows
 * LEVEL BY LEVEL, batched, so you can test at any depth:
 *
 *   npx tsx src/scripts/seed-tree-depth10.ts --depth 3    # root + L1..L3 (40 users)
 *   npx tsx src/scripts/seed-tree-depth10.ts --depth 10   # extend to full 88,573
 *   npx tsx src/scripts/seed-tree-depth10.ts              # = --depth 10
 *   npx tsx src/scripts/seed-tree-depth10.ts --clean      # delete every tree user
 *
 * Re-running with a larger --depth EXTENDS the existing tree (level-wise batches,
 * `ordered:false` + chunked insertMany). Root is "main user". Every user is
 * INACTIVE (real model: activation needs a real UserPackage). Password Aa@123,
 * PIN 1234 for all. Cleanup key: emails ending in `@tree.zeminex.dev`.
 */
import "dotenv/config";
import mongoose from "mongoose";
import { User } from "../models/index.js";
import { generateReferralCode } from "../utils/tokens.js";
import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;
const PASSWORD = "Aa@123";
const TRANSACTION_PIN = "1234";
const EMAIL_DOMAIN = "tree.zeminex.dev";
const BRANCH = 3;
const MAX_DEPTH = 10;
const CHUNK = 2000; // docs per insertMany (stays under the 16MB wire limit)

const treeEmailQuery = { email: { $regex: new RegExp(`${EMAIL_DOMAIN}$`, "i") } };

type Node = {
  _id: mongoose.Types.ObjectId;
  referralCode: string;
  lineage: mongoose.Types.ObjectId[];
  level: number;
};

async function clean(): Promise<void> {
  const res = await User.deleteMany(treeEmailQuery);
  console.log(`deleted ${res.deletedCount} tree user(s)`);
}

/** All nodes of one tree level: L0 → the root, Lk → users whose lineage has k ids. */
async function levelNodes(level: number): Promise<Node[]> {
  const docs =
    level === 0
      ? await User.findOne({ email: `main-user@${EMAIL_DOMAIN}` }).select("_id referralCode lineage").lean()
      : null;
  if (level === 0) {
    if (!docs) return [];
    return [{ _id: docs._id as mongoose.Types.ObjectId, referralCode: docs.referralCode, lineage: [], level: 0 }];
  }
  const rows = await User.find(treeEmailQuery)
    .select("_id referralCode lineage")
    .lean();
  return rows
    .filter((u) => (u.lineage?.length ?? 0) === level)
    .map((u) => ({ _id: u._id, referralCode: u.referralCode, lineage: u.lineage ?? [], level }));
}

async function build(depth: number): Promise<void> {
  if (depth < 1 || depth > MAX_DEPTH) {
    console.error(`--depth must be 1..${MAX_DEPTH}`);
    process.exit(1);
  }

  const passwordHash = bcrypt.hashSync(PASSWORD, SALT_ROUNDS);
  const pinHash = bcrypt.hashSync(TRANSACTION_PIN, SALT_ROUNDS);

  // Root: create once, reuse forever.
  let existingRoot = (await levelNodes(0))[0];
  if (!existingRoot) {
    const rootReferralCode = generateReferralCode();
    const root = new User({
      name: "main user",
      email: `main-user@${EMAIL_DOMAIN}`,
      referralCode: rootReferralCode,
      passwordHash,
      transactionPasswordHash: pinHash,
      role: "user",
      status: "inactive",
      sponsorId: null,
      referredBy: null,
      lineage: [],
    });
    await root.save();
    existingRoot = { _id: root._id, referralCode: rootReferralCode, lineage: [], level: 0 };
    console.log(`L0 root — "main user" / ${root.email} (code: ${rootReferralCode})`);
  } else {
    console.log(`L0 root exists — ${existingRoot._id}`);
  }

  // Current deepest level = largest lineage size present in the tree.
  const depths = await User.aggregate<{ _id: number }>([
    { $match: treeEmailQuery },
    { $group: { _id: { $size: "$lineage" } } },
    { $sort: { _id: -1 } },
  ]);
  const currentMax = depths.length ? Math.max(...depths.map((d) => d._id)) : 0;
  console.log(`tree depth: ${currentMax} (target ${depth})`);
  if (currentMax >= depth) {
    console.log("nothing to add — tree already reaches that depth");
    return;
  }

  let parents = await levelNodes(currentMax);
  let total = await User.countDocuments(treeEmailQuery);

  for (let level = currentMax + 1; level <= depth; level++) {
    const expectedChildren = parents.length * BRANCH;
    const nodes: Node[] = [];
    for (const parent of parents) {
      for (let i = 0; i < BRANCH; i++) {
        nodes.push({
          _id: new mongoose.Types.ObjectId(),
          referralCode: generateReferralCode(),
          lineage: [...parent.lineage, parent._id],
          level,
        });
      }
    }
    // Chunked insertMany, ordered:false → one rare dup code never aborts.
    let insertedCount = 0;
    for (let c = 0; c < nodes.length; c += CHUNK) {
      const chunk = nodes.slice(c, c + CHUNK);
      const docs = chunk.map((n, idx) => ({
        _id: n._id,
        name: `L${level} #${c + idx + 1}`,
        email: `tree-l${level}-${c + idx + 1}@${EMAIL_DOMAIN}`,
        passwordHash,
        transactionPasswordHash: pinHash,
        role: "user",
        status: "inactive",
        referralCode: n.referralCode,
        referredBy: "",
        sponsorId: null as unknown as mongoose.Types.ObjectId,
        lineage: n.lineage,
      }));
      const parentMap = new Map<string, Node>();
      for (const parent of parents) parentMap.set(parent._id.toString(), parent);
      for (const d of docs) {
        const parent = parentMap.get(String(d.lineage.at(-1)));
        d.referredBy = parent ? parent.referralCode : "";
        d.sponsorId = (parent ? parent._id : null) as never;
      }
      const inserted = await User.insertMany(docs, { ordered: false });
      insertedCount += inserted.length;
    }
    if (insertedCount !== expectedChildren) {
      console.error(`abort: L${level} inserted ${insertedCount}/${expectedChildren} — clean and re-run`);
      process.exit(1);
    }
    total += insertedCount;
    console.log(`L${level} — ${insertedCount} user(s) (total ${total})`);
    parents = nodes;
  }

  console.log(`done — tree users: ${total}, root login → main-user@${EMAIL_DOMAIN} / ${PASSWORD} (PIN ${TRANSACTION_PIN})`);
}

async function main(): Promise<void> {
  await mongoose.connect(process.env.MONGO_URI!);
  const depthArg = process.argv.find((a) => a.startsWith("--depth"));
  const depth = depthArg ? Number(depthArg.split("=")[1] ?? process.argv[process.argv.indexOf(depthArg) + 1]) : MAX_DEPTH;
  if (process.argv.includes("--clean")) {
    await clean();
  } else {
    await build(Number.isFinite(depth) && depth > 0 ? depth : MAX_DEPTH);
  }
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("tree seed failed:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});