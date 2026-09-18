/**
 * ONE-OFF destructive wipe: remove every non-admin user and all of their
 * data from the connected database, keep admin users + platform config.
 *
 *   KEEP    → User (role: "admin"), Setting, Package, Rank, CmsPage,
 *             Announcement, EmailTemplate, CronLog (scheduler dedup reads it)
 *   WIPE    → non-admin Users + their UserPackage / Deposit / Withdrawal /
 *             Wallet / WalletTransaction / Notification / SupportTicket /
 *             P2PTransfer / PaymentLog / ActivityLog, all BonanzaOffers,
 *             the TeamEnergySourceCache read-model, guest ContactMessages
 *
 *   cd server && npx tsx src/scripts/wipe-except-admin.ts
 */
import "dotenv/config";
import mongoose from "mongoose";
import {
  User,
  UserPackage,
  Deposit,
  Withdrawal,
  Wallet,
  WalletTransaction,
  Notification,
  SupportTicket,
  P2PTransfer,
  PaymentLog,
  ActivityLog,
  BonanzaOffer,
  TeamEnergySourceCache,
  ContactMessage,
} from "../models/index.js";

async function main() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error("MONGO_URI missing");
    process.exit(1);
  }
  await mongoose.connect(uri);
  console.log("connected:", mongoose.connection.name);

  const admins = (await User.find({ role: "admin" }).select("_id name email").lean()).map((a) => ({
    id: a._id.toString(),
    name: a.name,
  }));
  const adminIds = admins.map((a) => a.id);
  console.log(`keeping ${adminIds.length} admin user(s):`, admins.map((a) => a.name).join(", "));

  const notAdmin = { user: { $nin: adminIds } };
  const plan: [string, () => Promise<unknown>][] = [
    ["User (non-admin)", () => User.deleteMany({ role: { $ne: "admin" } })],
    ["UserPackage", () => UserPackage.deleteMany(notAdmin)],
    ["Deposit", () => Deposit.deleteMany(notAdmin)],
    ["Withdrawal", () => Withdrawal.deleteMany(notAdmin)],
    ["Wallet", () => Wallet.deleteMany(notAdmin)],
    ["WalletTransaction (non-admin)", () => WalletTransaction.deleteMany(notAdmin)],
    ["WalletTransaction (bonanza history)", () => WalletTransaction.deleteMany({ type: "bonanza" })],
    ["Notification", () => Notification.deleteMany(notAdmin)],
    ["SupportTicket", () => SupportTicket.deleteMany(notAdmin)],
    ["P2PTransfer", () =>
      P2PTransfer.deleteMany({
        $or: [{ fromUser: { $nin: adminIds } }, { toUser: { $nin: adminIds } }],
      })],
    ["PaymentLog", () => PaymentLog.deleteMany(notAdmin)],
    ["ActivityLog (non-admin actor)", () => ActivityLog.deleteMany({ actor: { $nin: adminIds } })],
    ["BonanzaOffer", () => BonanzaOffer.deleteMany({})],
    ["TeamEnergySourceCache", () => TeamEnergySourceCache.deleteMany({})],
    ["ContactMessage", () => ContactMessage.deleteMany({})],
  ];

  let failed = 0;
  for (const [label, run] of plan) {
    try {
      const res = (await run()) as { deletedCount?: number };
      console.log(`✓ ${label}: ${res.deletedCount ?? 0} deleted`);
    } catch (err) {
      failed++;
      console.error(`✗ ${label}:`, err instanceof Error ? err.message : String(err));
    }
  }

  const remainingUsers = await User.countDocuments({});
  console.log(`\ndone — Users remaining: ${remainingUsers}${failed ? `, ${failed} step(s) FAILED` : ""}`);
  await mongoose.disconnect();
  if (failed > 0) process.exit(1);
}

main();