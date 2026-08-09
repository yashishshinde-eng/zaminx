/**
 * Wipe all non-admin ("user-related") data from the database, keeping only
 * role: "admin" users and all admin-defined platform config (packages,
 * settings, CMS pages, ranks, bonanzas, announcements, email templates).
 *
 * Deleted: every non-admin user, their wallets, package activations, deposits,
 * withdrawals, the full wallet-transaction ledger, P2P transfers, notifications,
 * contact-form messages, and operational logs (payment / activity / cron).
 *
 * Usage:
 *   npx tsx src/resetUserData.ts            # dry-run: prints counts only
 *   npx tsx src/resetUserData.ts --confirm  # backs up to ./backups, then deletes
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import mongoose from "mongoose";
import { connectDB } from "./config/db.js";
import { logger } from "./config/logger.js";
import {
  User,
  Wallet,
  UserPackage,
  Deposit,
  Withdrawal,
  WalletTransaction,
  P2PTransfer,
  Notification,
  PaymentLog,
  ActivityLog,
  CronLog,
  ContactMessage,
} from "./models/index.js";

const CONFIRM = process.argv.includes("--confirm");

type Target = {
  name: string;
  model: mongoose.Model<any>;
  q: Record<string, unknown>;
  // When true, delete via the raw MongoDB collection to bypass Mongoose model
  // middleware (used for the immutable wallet ledger, which blocks deleteMany).
  raw?: boolean;
};

async function dump(targets: Target[], dir: string) {
  for (const { name, model, q } of targets) {
    const docs = await model.find(q).lean();
    const serialised = docs.map((d: Record<string, any>) => {
      const out: Record<string, unknown> = { ...d };
      if (d._id) out._id = String(d._id);
      if (d.createdAt) out.createdAt = new Date(d.createdAt).toISOString();
      if (d.updatedAt) out.updatedAt = new Date(d.updatedAt).toISOString();
      return out;
    });
    writeFileSync(join(dir, `${name}.json`), JSON.stringify(serialised, null, 2));
  }
}

async function main() {
  await connectDB();

  const admins = await User.find({ role: "admin" }).select("_id email").lean();
  const adminIds = admins.map((a) => a._id);
  logger.info(
    `Admin users to keep: ${admins.length ? admins.map((a) => a.email).join(", ") : "(none found!)"}`,
  );
  if (adminIds.length === 0) {
    logger.error("No admin users found — aborting to avoid wiping the entire user collection.");
    await mongoose.disconnect();
    process.exit(1);
  }

  const nonAdminUser = { role: { $ne: "admin" } };
  const ninUser = { user: { $nin: adminIds } };
  const nonAdminP2P = {
    fromUser: { $nin: adminIds },
    toUser: { $nin: adminIds },
  };

  // Per-user collections keep any admin-owned docs; shared logs/messages are
  // cleared entirely (admin has no meaningful runtime entries there).
  const targets: Target[] = [
    { name: "User", model: User, q: nonAdminUser },
    { name: "Wallet", model: Wallet, q: ninUser },
    { name: "UserPackage", model: UserPackage, q: ninUser },
    { name: "Deposit", model: Deposit, q: ninUser },
    { name: "Withdrawal", model: Withdrawal, q: ninUser },
    { name: "WalletTransaction", model: WalletTransaction, q: ninUser, raw: true },
    { name: "P2PTransfer", model: P2PTransfer, q: nonAdminP2P },
    { name: "Notification", model: Notification, q: ninUser },
    { name: "PaymentLog", model: PaymentLog, q: {} },
    { name: "ActivityLog", model: ActivityLog, q: {} },
    { name: "CronLog", model: CronLog, q: {} },
    { name: "ContactMessage", model: ContactMessage, q: {} },
  ];

  const before = await Promise.all(
    targets.map(async (t) => ({ name: t.name, count: await t.model.countDocuments(t.q) })),
  );
  logger.info(`Before:\n${before.map((b) => `  ${b.name.padEnd(20)} ${b.count}`).join("\n")}`);

  if (!CONFIRM) {
    logger.info("DRY RUN — nothing was deleted. Re-run with --confirm to back up and execute.");
    await mongoose.disconnect();
    process.exit(0);
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const dir = join(process.cwd(), "backups", `reset-${stamp}`);
  mkdirSync(dir, { recursive: true });
  await dump(targets, dir);
  logger.info(`Backup written to ${dir}`);

  let totalDeleted = 0;
  for (const t of targets) {
    let deletedCount: number;
    if (t.raw) {
      const res = await mongoose.connection.collection(t.model.collection.name).deleteMany(t.q);
      deletedCount = res.deletedCount;
    } else {
      const res = await t.model.deleteMany(t.q);
      deletedCount = res.deletedCount;
    }
    totalDeleted += deletedCount;
    logger.info(`Deleted ${t.name.padEnd(20)} ${deletedCount}`);
  }

  const after = await Promise.all(
    targets.map(async (t) => ({ name: t.name, count: await t.model.countDocuments(t.q) })),
  );
  logger.info(`After:\n${after.map((b) => `  ${b.name.padEnd(20)} ${b.count}`).join("\n")}`);

  const remainingUsers = await User.countDocuments();
  const remainingAdmins = await User.countDocuments({ role: "admin" });
  logger.info(
    `Done. Total deleted: ${totalDeleted}. Users remaining: ${remainingUsers} (admins: ${remainingAdmins}).`,
  );

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  logger.error("Reset failed", { error: err instanceof Error ? err.message : String(err) });
  process.exit(1);
});