/**
 * Remove every user + downstream data created by scenario-test.ts.
 *
 * Targets all users whose email ends with `@scenario.local` (the suffix every
 * scenario-created user uses), then cascades their packages, wallet ledger
 * entries, deposits, withdrawals, and activity logs. The seeded admin
 * (admin@zeminex.local) is NOT touched — different domain.
 *
 *   npx tsx scenario-cleanup.ts
 */

import dotenv from "dotenv";
dotenv.config();

const EMAIL_DOMAIN = "@scenario.local";

async function main() {
  const mongoose = (await import("mongoose")).default;
  await mongoose.connect(process.env.MONGO_URI!);
  console.log(`✅ Connected to: ${mongoose.connection.name} @ ${mongoose.connection.host}`);

  const { User, UserPackage, WalletTransaction, Deposit, Withdrawal, ActivityLog } = await import("./src/models/index.js");

  const ids = (await User.find({ email: { $regex: /@scenario\.local$/ } }).distinct("_id")) as unknown as string[];
  if (ids.length === 0) {
    console.log("ℹ️  No @scenario.local users found — nothing to clean.");
    await mongoose.disconnect();
    return;
  }
  console.log(`🗑️  Deleting ${ids.length} scenario user(s) + their data…`);

  const objIds = ids.map((id) => new mongoose.Types.ObjectId(id));
  const r = (n: number | undefined) => n ?? 0;
  const pkg = await UserPackage.deleteMany({ user: { $in: objIds } });
  const tx = await WalletTransaction.deleteMany({ user: { $in: objIds } });
  const dep = await Deposit.deleteMany({ user: { $in: objIds } });
  const wd = await Withdrawal.deleteMany({ user: { $in: objIds } });
  const al = await ActivityLog.deleteMany({ actor: { $in: objIds } });
  const usr = await User.deleteMany({ _id: { $in: objIds } });

  console.log(`   users:           ${r(usr.deletedCount)}`);
  console.log(`   user packages:   ${r(pkg.deletedCount)}`);
  console.log(`   wallet txs:      ${r(tx.deletedCount)}`);
  console.log(`   deposits:        ${r(dep.deletedCount)}`);
  console.log(`   withdrawals:     ${r(wd.deletedCount)}`);
  console.log(`   activity logs:   ${r(al.deletedCount)}`);
  console.log("✅ Cleanup complete.");

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error("CLEANUP FAILED:", e?.stack || e);
  process.exit(1);
});