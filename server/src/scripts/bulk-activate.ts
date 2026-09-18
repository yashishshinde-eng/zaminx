/**
 * Bulk-activate all inactive users at a given tree level (or 5..10 if no arg).
 *
 * Does the core activation work in batches WITHOUT per-activation rank
 * evaluation (the slow part). After each level completes, runs rank eval
 * for the whole tree once. Outputs a closing report for the report file.
 */
import "dotenv/config";
import mongoose from "mongoose";
import { User, Package, UserPackage, Wallet, WalletTransaction, Deposit } from "../models/index.js";
import { applyLedgerEntry } from "../services/wallet.service.js";
import { getDirectBonusPct } from "../services/setting.service.js";
import { evaluateRankForUser, syncHighestStarForUser } from "../services/rank.service.js";

const EMAIL_DOMAIN = "tree.zeminex.dev";
const ROOT_ID = "6aac2d0f6f6e90fc1e148253";

async function getWallet(userId: string) {
  const w = await Wallet.findOne({ user: userId }).lean() as any;
  return w?.balances ?? { main: { available: 0, onHold: 0 }, bonus: { available: 0, onHold: 0 }, trading: { available: 0, onHold: 0 } };
}

async function activateLevel(level: number, pkg: any, directPct: number): Promise<void> {
  console.log(`\n========== LEVEL ${level} ==========`);

  const levelUsers = await User.find({
    email: { $regex: new RegExp(`${EMAIL_DOMAIN}$`, "i") },
    status: "inactive",
    $expr: { $eq: [{ $size: "$lineage" }, level] },
  }).select("_id name email sponsorId referredBy lineage").lean();

  console.log(`L${level}: ${levelUsers.length} inactive users to activate`);
  if (levelUsers.length === 0) return;

  // Pre-fetch all sponsors (parent = last in lineage)
  const sponsorIds = new Set<string>();
  for (const u of levelUsers) {
    const parentId = u.lineage?.[u.lineage.length - 1];
    if (parentId) sponsorIds.add(parentId.toString());
  }
  const sponsorIdsArr = Array.from(sponsorIds);
  const sponsors = await User.find({ _id: { $in: sponsorIdsArr } }).select("_id name referralCode").lean();
  const sponsorMap = new Map(sponsors.map(s => [s._id.toString(), s]));
  const sponsorActiveSet = new Set(
    (await UserPackage.find({ user: { $in: sponsorIdsArr }, status: "active" }).distinct("user")).map((id: any) => id.toString()),
  );

  const walletBefore = await getWallet(ROOT_ID);
  console.log(`Root wallet BEFORE: main=$${walletBefore.main.available} bonus=$${walletBefore.bonus.available}`);

  const price = pkg.priceUsd;
  const bonusAmount = Math.round((price * directPct) / 100 * 100) / 100;
  const now = new Date();
  const DAY_MS = 86_400_000;
  const expiresAt = pkg.durationDays > 0 ? new Date(now.getTime() + pkg.durationDays * DAY_MS) : null;
  let activated = 0;
  let failed = 0;
  let directBonusesPaid = 0;

  for (let i = 0; i < levelUsers.length; i++) {
    const u = levelUsers[i];
    try {
      // 1. Create active UserPackage
      const subscription = await UserPackage.create({
        user: u._id,
        package: pkg._id,
        snapshot: { name: pkg.name, priceUsd: pkg.priceUsd, dailyReturnPct: pkg.dailyReturnPct, durationDays: pkg.durationDays },
        status: "active",
        paymentStatus: "paid",
        activatedAt: now,
        expiresAt,
      });

      // 2. Debit root wallet
      await applyLedgerEntry({
        userId: ROOT_ID,
        wallet: "main",
        field: "available",
        direction: "debit",
        amount: price,
        type: "package_activation" as any,
        reference: { resource: "UserPackage", resourceId: subscription._id.toString() },
        memo: `Package activation for ${u.name} — ${pkg.name}`,
        meta: { packageId: pkg._id.toString(), targetUserId: u._id.toString(), activatedBy: ROOT_ID },
      });

      // 3. Flip user to active
      await User.updateOne({ _id: u._id }, { $set: { status: "active" } }).exec();

      // 4. Create deposit record
      await Deposit.create({
        user: u._id,
        userPackage: subscription._id,
        package: pkg._id,
        amountUsd: price,
        currency: "USDT-BEP20",
        status: "paid",
        paidAt: now,
        sandbox: false,
        meta: { method: "wallet", packageId: pkg._id.toString(), activatedBy: ROOT_ID },
      });

      // 5. Award direct bonus to sponsor (the parent)
      const parentId = u.lineage?.[u.lineage.length - 1]?.toString();
      if (parentId && sponsorActiveSet.has(parentId) && bonusAmount > 0) {
        const sponsor = sponsorMap.get(parentId);
        await applyLedgerEntry({
          userId: parentId,
          wallet: "bonus",
          field: "available",
          direction: "credit",
          amount: bonusAmount,
          type: "direct_bonus" as any,
          reference: { resource: "Deposit", resourceId: `direct-bonus:${subscription._id}` },
          memo: `Direct connect bonus — ${directPct}% of package activation — from ${u.name} (L1)`,
          meta: { buyerId: u._id.toString(), depositId: subscription._id.toString(), pct: directPct, level: 1, fromUserId: u._id.toString(), fromUserName: u.name, fromReferralCode: sponsor?.referralCode ?? null },
        });
        directBonusesPaid++;
      }

      activated++;
      if (activated % 100 === 0) console.log(`  ...${activated}/${levelUsers.length} activated`);
    } catch (err) {
      failed++;
      if (failed <= 5) console.error(`  FAIL: ${u.email} — ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  console.log(`Activation: ${activated} ok, ${failed} failed, ${directBonusesPaid} direct bonuses paid`);

  // Post-level: run rank evaluation for all active users (once, not per-activation)
  console.log("Running rank evaluation for all active users...");
  const activeUserIds = await User.find({ status: "active", email: { $regex: new RegExp(`${EMAIL_DOMAIN}$`, "i") } })
    .select("_id").lean();
  let rankAwards = 0;
  let rankErrors = 0;
  for (const u of activeUserIds) {
    const id = u._id.toString();
    await syncHighestStarForUser(id).catch(() => undefined);
    const r = await evaluateRankForUser(id).catch(() => ({ awarded: 0, errors: 1 }));
    rankAwards += r.awarded;
    rankErrors += r.errors;
  }
  console.log(`Rank eval: ${rankAwards} awards, ${rankErrors} errors`);

  const walletAfter = await getWallet(ROOT_ID);
  const activeCount = await User.countDocuments({ status: "active", email: { $regex: new RegExp(`${EMAIL_DOMAIN}$`, "i") } });
  console.log(`Root wallet AFTER: main=$${walletAfter.main.available} bonus=$${walletAfter.bonus.available}`);
  console.log(`Active tree users: ${activeCount}`);

  // Root rank rewards this level
  const rootRankRewards = await WalletTransaction.find({ user: ROOT_ID as any, type: "rank_reward" }).sort({ createdAt: 1 }).lean();
  const rootBonuses = await WalletTransaction.find({ user: ROOT_ID as any, type: "direct_bonus" }).sort({ createdAt: 1 }).lean();
  console.log(`Root total: ${rootRankRewards.length} rank rewards, ${rootBonuses.length} direct bonuses`);
  const totalRankIncome = rootRankRewards.reduce((s, t) => s + t.amount, 0);
  const totalDirectIncome = rootBonuses.reduce((s, t) => s + t.amount, 0);
  console.log(`Root income: $${totalDirectIncome} direct + $${totalRankIncome} rank = $${totalDirectIncome + totalRankIncome} total`);
}

async function main() {
  await mongoose.connect(process.env.MONGO_URI!);

  const pkg = await Package.findOne({ status: "active" }).sort({ priceUsd: 1 }).lean();
  if (!pkg) { console.error("no active package"); process.exit(1); }
  const directPct = await getDirectBonusPct();
  console.log(`Package: ${pkg.name} ($${pkg.priceUsd}), direct bonus: ${directPct}%`);

  // Fund root wallet if needed
  const wallet = await getWallet(ROOT_ID);
  const FUND = 10_000_000;
  if (wallet.main.available < 1_000_000) {
    console.log(`Funding root wallet with $${FUND}...`);
    await applyLedgerEntry({
      userId: ROOT_ID, wallet: "main", field: "available", direction: "credit",
      amount: FUND, type: "deposit" as any,
      reference: { resource: "Seed", resourceId: "tree-bulk-fund" },
      memo: "Bulk activation test fund",
    });
  }

  const startLevel = Number(process.argv[2] ?? 5);
  const endLevel = Number(process.argv[3] ?? 10);

  for (let level = startLevel; level <= endLevel; level++) {
    await activateLevel(level, pkg, directPct);
  }

  // Final summary
  const activeCount = await User.countDocuments({ status: "active", email: { $regex: new RegExp(`${EMAIL_DOMAIN}$`, "i") } });
  console.log(`\n===== FINAL SUMMARY =====`);
  console.log(`Total active tree users: ${activeCount}`);

  const rootRankRewards = await WalletTransaction.find({ user: ROOT_ID as any, type: "rank_reward" }).sort({ createdAt: 1 }).lean();
  const rootBonuses = await WalletTransaction.find({ user: ROOT_ID as any, type: "direct_bonus" }).sort({ createdAt: 1 }).lean();
  const walletFinal = await getWallet(ROOT_ID);
  console.log(`Root wallet: main=$${walletFinal.main.available} bonus=$${walletFinal.bonus.available} trading=$${walletFinal.trading.available}`);
  console.log(`Root direct bonuses: ${rootBonuses.length} x $5 = $${rootBonuses.reduce((s, t) => s + t.amount, 0)}`);
  console.log(`Root rank rewards: ${rootRankRewards.length} total = $${rootRankRewards.reduce((s, t) => s + t.amount, 0)}`);
  for (const t of rootRankRewards) console.log(`  ${t.memo}: $${t.amount}`);

  await mongoose.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });