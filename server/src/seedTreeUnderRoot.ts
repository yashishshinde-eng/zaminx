/**
 * Grow a 3-ary referral tree of depth 5 (363 users) under an EXISTING root
 * user, identified by referral code. Mirrors seedReferralTree.ts but attaches
 * to a real user instead of creating a fresh synthetic root.
 *
 *   L1: 3   L2: 9   L3: 27   L4: 81   L5: 243   Total: 363
 *
 * Every generated user is `inactive` (model default) — referral links only
 * (sponsorId/lineage/referredBy), no wallet/package activation. Identifiable
 * for cleanup by email domain `@tree-test.zeminex.dev`.
 *
 * Usage:
 *   npx tsx src/seedTreeUnderRoot.ts <ROOT_REFERRAL_CODE>            # build
 *   npx tsx src/seedTreeUnderRoot.ts <ROOT_REFERRAL_CODE> --clean    # delete tree users
 */
import mongoose from "mongoose";
import { connectDB } from "./config/db.js";
import { logger } from "./config/logger.js";
import { User } from "./models/index.js";

const PASSWORD = "Aa@123";
const EMAIL_DOMAIN = "tree-test.zeminex.dev";
const BRANCH = 3;
const MAX_DEPTH = 5;

const treeEmailQuery = { email: { $regex: new RegExp(`${EMAIL_DOMAIN}$`, "i") } };

async function clean(): Promise<void> {
  const result = await User.deleteMany(treeEmailQuery);
  logger.info(`Deleted ${result.deletedCount} tree user(s).`);
}

async function build(rootCode: string): Promise<void> {
  const existing = await User.countDocuments(treeEmailQuery);
  if (existing > 0) {
    logger.warn(`Aborting: ${existing} tree user(s) already exist. Run with --clean first.`);
    process.exit(1);
  }

  const root = await User.findOne({ referralCode: rootCode });
  if (!root) {
    logger.error(`No user found with referralCode ${rootCode}`);
    process.exit(1);
  }
  logger.info(`Root: ${root.email} (${root.referralCode}), lineage depth ${root.lineage.length}`);

  type Node = { _id: mongoose.Types.ObjectId; referralCode: string; lineage: mongoose.Types.ObjectId[] };

  let parents: Node[] = [{ _id: root._id, referralCode: root.referralCode, lineage: root.lineage }];
  let total = 0;

  for (let level = 1; level <= MAX_DEPTH; level++) {
    const children: Node[] = [];
    let indexInLevel = 0;

    for (const parent of parents) {
      for (let i = 0; i < BRANCH; i++) {
        indexInLevel += 1;
        const child = new User({
          name: `Tree L${level} #${indexInLevel}`,
          email: `zam-l${level}-${indexInLevel}@${EMAIL_DOMAIN}`,
          password: PASSWORD,
          referredBy: parent.referralCode,
          sponsorId: parent._id,
          lineage: [...parent.lineage, parent._id],
        });
        await child.save();
        children.push({ _id: child._id, referralCode: child.referralCode, lineage: child.lineage });
      }
    }

    total += children.length;
    logger.info(`L${level} created — ${children.length} user(s)`);
    parents = children;
  }

  logger.info(`Tree complete: ${total} users under ${rootCode}. Password for all: ${PASSWORD}`);
}

async function main(): Promise<void> {
  await connectDB();
  const args = process.argv.slice(2);
  const rootCode = args.find((a) => !a.startsWith("--"));
  if (args.includes("--clean")) {
    await clean();
  } else {
    if (!rootCode) {
      logger.error("Usage: npx tsx src/seedTreeUnderRoot.ts <ROOT_REFERRAL_CODE> [--clean]");
      process.exit(1);
    }
    await build(rootCode);
  }
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  logger.error("Tree seed failed", { error: err instanceof Error ? err.message : String(err) });
  process.exit(1);
});
