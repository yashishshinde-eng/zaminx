/**
 * Generate a 3-ary referral tree of depth 4 (121 users) for testing.
 *
 *   Level 0:  1 root
 *   Level 1:  3   (3 per L0 node)
 *   Level 2:  9
 *   Level 3:  27
 *   Level 4:  81
 *   Total :  121
 *
 * Every Level 0–3 user has exactly 3 direct referrals; Level 4 users have 0.
 * No Level 5 users are created.
 *
 * Why we build User docs directly instead of calling `registerUser`:
 *  - `registerUser` requires a valid, *active* referrer and a referrer code on
 *    every signup; the root has no referrer. We materialise the referral graph
 *    (`sponsorId`/`lineage`/`referredBy`) directly, so that guard never applies.
 *  - Every generated user is `inactive` (the model default). `active` is reserved
 *    for users who have activated a real package (an active `UserPackage` row);
 *    we never set `status: "active"` artificially. See `--report` to verify.
 *
 * All generated users share the password given below and are identifiable for
 * cleanup by their email domain (`@tree-test.zeminex.dev`).
 *
 * Usage:
 *   npx tsx src/seedReferralTree.ts            # create the tree (aborts if one exists)
 *   npx tsx src/seedReferralTree.ts --clean    # delete every tree user and exit
 */
import { connectDB } from "./config/db.js";
import { logger } from "./config/logger.js";
import { User, UserPackage, Package } from "./models/index.js";
import { applyLedgerEntry } from "./services/wallet.service.js";
import { activatePackageFromWallet } from "./services/deposit.service.js";
import { runDailyYield } from "./services/compensation.service.js";

const PASSWORD = "Aa@123";
const EMAIL_DOMAIN = "tree-test.zeminex.dev";
const BRANCH = 3; // 3-ary
const MAX_DEPTH = 4; // levels 0..4

/** Tree users all carry this email domain → one regex cleans them all up. */
const treeEmailQuery = { email: { $regex: new RegExp(`${EMAIL_DOMAIN}$`, "i") } };

async function clean(): Promise<void> {
  const result = await User.deleteMany(treeEmailQuery);
  logger.info(`🧹 Deleted ${result.deletedCount} tree user(s).`);
}

async function build(): Promise<void> {
  // Guard: never duplicate an existing tree. Run `--clean` first to rebuild.
  const existing = await User.countDocuments(treeEmailQuery);
  if (existing > 0) {
    logger.warn(
      `Aborting: ${existing} tree user(s) already exist. Run with --clean to remove them first.`,
    );
    process.exit(1);
  }

  type Node = { _id: import("mongoose").Types.ObjectId; referralCode: string; lineage: import("mongoose").Types.ObjectId[]; level: number };

  // Level 0 — root (no referrer). All generated users are `inactive` (the model
  // default): `active` is reserved for users who have activated a real package
  // (an active UserPackage row). We never set `status: "active"` artificially —
  // the referral graph (sponsorId/lineage) is materialised directly here, so the
  // `registerUser` "referrer must be active" guard does not apply.
  const root = new User({
    name: "Tree Root",
    email: `tree-root@${EMAIL_DOMAIN}`,
    password: PASSWORD, // virtual hashes it
  });
  await root.save();
  let parents: Node[] = [
    { _id: root._id, referralCode: root.referralCode, lineage: root.lineage, level: 0 },
  ];
  logger.info(`✅ L0 root created — ${root.email} (referralCode: ${root.referralCode}, status: inactive)`);

  let total = 1;

  // Levels 1..4
  for (let level = 1; level <= MAX_DEPTH; level++) {
    const children: Node[] = [];
    let indexInLevel = 0;

    for (const parent of parents) {
      for (let i = 0; i < BRANCH; i++) {
        indexInLevel += 1;
        const child = new User({
          name: `Tree L${level} #${indexInLevel}`,
          email: `tree-l${level}-${indexInLevel}@${EMAIL_DOMAIN}`,
          password: PASSWORD,
          referredBy: parent.referralCode,
          sponsorId: parent._id,
          lineage: [...parent.lineage, parent._id], // root → … → this sponsor
        });
        await child.save();
        children.push({
          _id: child._id,
          referralCode: child.referralCode,
          lineage: child.lineage,
          level,
        });
      }
    }

    total += children.length;
    logger.info(`✅ L${level} created — ${children.length} user(s) (status: inactive)`);
    parents = children;
  }

  // ---- Verification (DB-level, not just by construction) ----
  const counts = await User.aggregate<{ _id: import("mongoose").Types.ObjectId | null; count: number }>([
    { $match: treeEmailQuery },
    { $group: { _id: "$sponsorId", count: { $sum: 1 } } },
  ]);
  const bySponsor = new Map<string, number>();
  for (const c of counts) bySponsor.set(String(c._id), c.count);

  const expectedSponsors = 1 + 3 + 9 + 27; // L0–L3 users each sponsor 3
  const sponsorsWithThree = [...bySponsor.values()].filter((c) => c === BRANCH).length;
  const ok =
    total === 121 &&
    sponsorsWithThree === expectedSponsors &&
    parents.length === 81; // final `parents` = L4 leaves

  logger.info(
    `📊 Verify: total=${total}, sponsors-with-${BRANCH}=${sponsorsWithThree}/${expectedSponsors}, L4 leaves=${parents.length}`,
  );

  if (!ok) {
    logger.error(`❌ Verification failed — expected 121 users, 40 sponsors×3, 81 leaves.`);
    process.exit(1);
  }

  logger.info(`🎉 Referral tree complete: 121 users (1 + 3 + 9 + 27 + 81). Password for all: ${PASSWORD}`);
  logger.info(`   Root login → ${root.email} / ${PASSWORD}`);
}

/**
 * Report the live DB state of the tree: user `status` breakdown vs. how many
 * actually hold an *active package* (UserPackage.status === "active"). This is
 * the authoritative check — `status: "active"` on the User doc does NOT imply a
 * package; only an active UserPackage row does.
 */
async function report(): Promise<void> {
  const treeUsers = await User.find(treeEmailQuery).select("_id name email status").lean();
  if (treeUsers.length === 0) {
    logger.info("No tree users found. Run without args to create the tree.");
    return;
  }
  const ids = treeUsers.map((u) => u._id);

  const byStatus = { active: 0, inactive: 0, blocked: 0 } as Record<string, number>;
  for (const u of treeUsers) byStatus[u.status] = (byStatus[u.status] ?? 0) + 1;

  const totalPkgs = await UserPackage.countDocuments({ user: { $in: ids } });
  const activePkgs = await UserPackage.countDocuments({ user: { $in: ids }, status: "active" });
  const usersWithActivePkg = (await UserPackage.find({ user: { $in: ids }, status: "active" }).distinct("user")).length;

  // Active package catalog (for reference when activating later).
  const catalog = await Package.find({ status: "active" }).select("name slug priceUsd").lean();

  logger.info(`🌳 Tree users: ${treeUsers.length}`);
  logger.info(`   User.status → active: ${byStatus.active ?? 0}, inactive: ${byStatus.inactive ?? 0}, blocked: ${byStatus.blocked ?? 0}`);
  logger.info(`   UserPackage rows: ${totalPkgs} total, ${activePkgs} active`);
  logger.info(`   Users holding ≥1 active package: ${usersWithActivePkg} / ${treeUsers.length}`);
  logger.info(
    `   Active package catalog: ${catalog.map((p) => `${p.name} (${p.slug}, $${p.priceUsd})`).join(", ") || "(none)"}`,
  );
}

/**
 * Reset every tree user to `inactive` (the model default). Undoes any artificial
 * `status: "active"` so the tree matches the real model: no package → inactive.
 * Idempotent.
 */
async function deactivate(): Promise<void> {
  const treeUsers = await User.countDocuments(treeEmailQuery);
  if (treeUsers === 0) {
    logger.info("No tree users found — nothing to deactivate.");
    return;
  }
  const res = await User.updateMany(treeEmailQuery, { $set: { status: "inactive" } });
  logger.info(`🔁 Reset ${res.modifiedCount} tree user(s) to inactive (of ${treeUsers} matched).`);
}

/**
 * Activate the $50 package for every tree user, root first, then top-down BFS
 * (the creation order). Reuses the real `activatePackageFromWallet` flow so all
 * side effects match a genuine activation: active UserPackage, paid Deposit,
 * User.status → active, and a 10% Direct Connect Bonus ($5) to the sponsor's
 * bonus wallet. The sponsor must hold an active package for the bonus to fire,
 * which is why order is top-down (root → L1 → … → L4).
 *
 * `activatePackageFromWallet` debits $50 from the user's Main wallet, so each
 * user is first funded $50 (idempotent, keyed by user id). Net Main balance ends
 * at $0; the package then accrues $1/day yield to the trading wallet via the
 * scheduler. Idempotent: users that already hold a pending/active package are
 * skipped, so re-running is safe.
 */
async function activate(): Promise<void> {
  const pkg = await Package.findOne({ slug: "zeminex-global", status: "active" });
  if (!pkg) {
    logger.error("Active package 'zeminex-global' not found — run `npm run seed` first.");
    process.exit(1);
  }
  const pkgId = pkg._id.toString();
  const price = pkg.priceUsd;

  // createdAt asc = BFS creation order = top-down (root, L1, L2, L3, L4).
  const treeUsers = await User.find(treeEmailQuery)
    .select("_id name email sponsorId")
    .sort({ createdAt: 1 })
    .lean();
  if (treeUsers.length === 0) {
    logger.info("No tree users found — run without args to create the tree first.");
    return;
  }

  let activated = 0;
  let skipped = 0;
  let failed = 0;
  let i = 0;

  for (const u of treeUsers) {
    i++;
    const userId = u._id.toString();
    // Idempotency: skip users that already hold a pending/active package.
    const existing = await UserPackage.findOne({ user: userId, status: { $in: ["pending", "active"] } });
    if (existing) {
      skipped++;
      continue;
    }
    try {
      // 1. Fund Main wallet $50 (idempotent by reference) so the debit below passes.
      await applyLedgerEntry({
        userId,
        wallet: "main",
        field: "available",
        direction: "credit",
        amount: price,
        type: "deposit",
        reference: { resource: "TestFunding", resourceId: userId },
        memo: `Test funding for $${price} package activation`,
      });
      // 2. Buy + activate the package. Debits $50, creates active UserPackage +
      //    paid Deposit, flips User.status → active, awards 10% direct bonus to
      //    the sponsor's bonus wallet (sponsor already active, top-down order).
      await activatePackageFromWallet(userId, pkgId, {});
      activated++;
      if (i % 10 === 0 || i === treeUsers.length) {
        logger.info(`📦 Progress ${i}/${treeUsers.length} — activated ${activated}, skipped ${skipped}, failed ${failed}`);
      }
    } catch (err) {
      failed++;
      logger.error(`Failed activating ${u.email}`, { error: err instanceof Error ? err.message : String(err) });
    }
  }

  logger.info(
    `🎉 Activation complete: ${activated} activated, ${skipped} already-active skipped, ${failed} failed (of ${treeUsers.length}).`,
  );
}

/**
 * Run the daily trade-yield credit now (idempotent per package per UTC day).
 * Processes every active UserPackage in the DB — here that's the 121 tree users.
 * Credits $1/day (2% of $50) to each user's trading wallet, bounded by the $15
 * monthly cap. Equivalent to what the `daily_yield` scheduler job does; this just
 * brings it forward so income is visible immediately.
 */
async function runYield(): Promise<void> {
  const summary = await runDailyYield();
  logger.info(
    `💸 Daily yield run — processed: ${summary.processed}, credited: ${summary.credited}, skipped: ${summary.skipped}, expired: ${summary.expired}, errors: ${summary.errors} (asOf ${summary.asOf})`,
  );
}

async function main(): Promise<void> {
  await connectDB();
  const args = new Set(process.argv.slice(2));
  if (args.has("--clean")) {
    await clean();
  } else if (args.has("--report")) {
    await report();
  } else if (args.has("--deactivate")) {
    await deactivate();
  } else if (args.has("--activate")) {
    await activate();
  } else if (args.has("--run-yield")) {
    await runYield();
  } else {
    await build();
  }
  await import("mongoose").then((m) => m.default.disconnect());
  process.exit(0);
}

main().catch((err) => {
  logger.error("Referral-tree seed failed", { error: err instanceof Error ? err.message : String(err) });
  process.exit(1);
});