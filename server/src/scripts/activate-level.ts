import "dotenv/config";
import mongoose from "mongoose";
import { User, Package, WalletTransaction } from "../models/index.js";
import { applyLedgerEntry } from "../services/wallet.service.js";
import { activatePackageFromWallet } from "../services/deposit.service.js";

const ROOT_EMAIL = "main-user@tree.zeminex.dev";
const EMAIL_DOMAIN = "tree.zeminex.dev";
const FUND_AMOUNT = 5_000_000; // $5M test fund — enough for all 88k users at $50 each

async function getWalletBalances(userId: string) {
  const w = await mongoose.model("Wallet").findOne({ user: userId }).lean();
  const b = (w as any)?.balances;
  return {
    main: b?.main ?? { available: 0, onHold: 0 },
    bonus: b?.bonus ?? { available: 0, onHold: 0 },
    trading: b?.trading ?? { available: 0, onHold: 0 },
  };
}

async function getIncomeSummary(userId: string) {
  const txns = await WalletTransaction.find({ userId: new mongoose.Types.ObjectId(userId) }).lean();
  const byType: Record<string, { credit: number; debit: number; count: number }> = {};
  for (const t of txns) {
    const key = t.type;
    if (!byType[key]) byType[key] = { credit: 0, debit: 0, count: 0 };
    if (t.direction === "credit") byType[key].credit += t.amount;
    else byType[key].debit += t.amount;
    byType[key].count++;
  }
  return byType;
}

async function main() {
  await mongoose.connect(process.env.MONGO_URI!);

  const root = await User.findOne({ email: ROOT_EMAIL }).select("_id").lean();
  if (!root) { console.error("root not found"); process.exit(1); }
  const rootId = root._id.toString();
  console.log(`Root: ${rootId}`);

  // Check current wallet
  const walletBefore = await getWalletBalances(rootId);
  console.log(`Wallet BEFORE:`, JSON.stringify(walletBefore));

  // Fund the root wallet if empty
  if (walletBefore.main.available < FUND_AMOUNT) {
    console.log(`Funding root wallet with $${FUND_AMOUNT}...`);
    await applyLedgerEntry({
      userId: rootId,
      wallet: "main",
      field: "available",
      direction: "credit",
      amount: FUND_AMOUNT,
      type: "deposit" as any,
      reference: { resource: "Seed", resourceId: "tree-test-fund" },
      memo: "Test fund for tree activation",
    });
    console.log("Funded.");
  }

  const walletAfterFund = await getWalletBalances(rootId);
  console.log(`Wallet AFTER FUND:`, JSON.stringify(walletAfterFund));

  // Find cheapest active package
  const pkg = await Package.findOne({ status: "active" }).sort({ priceUsd: 1 }).lean();
  if (!pkg) { console.error("no active package"); process.exit(1); }
  console.log(`Package: ${pkg.name} ($${pkg.priceUsd})`);

  // Get users at the target level
  const level = Number(process.argv[2] ?? 1);
  const levelUsers = await User.find({
    email: { $regex: new RegExp(`${EMAIL_DOMAIN}$`, "i") },
    $expr: { $eq: [{ $size: "$lineage" }, level] },
  }).select("_id name email status").lean();
  console.log(`\nL${level}: ${levelUsers.length} users to activate`);

  const incomeBefore = await getIncomeSummary(rootId);
  console.log(`Income BEFORE:`, JSON.stringify(incomeBefore));

  let activated = 0;
  let failed = 0;
  for (const u of levelUsers) {
    try {
      await activatePackageFromWallet(rootId, pkg._id.toString(), {}, u._id.toString());
      activated++;
      console.log(`  OK: ${u.email}`);
    } catch (err) {
      failed++;
      console.error(`  FAIL: ${u.email} — ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  console.log(`\n=== CLOSING ${level} ===`);
  console.log(`Activated: ${activated}, Failed: ${failed}`);

  const walletAfter = await getWalletBalances(rootId);
  console.log(`Wallet AFTER:`, JSON.stringify(walletAfter));

  const incomeAfter = await getIncomeSummary(rootId);
  console.log(`Income AFTER:`, JSON.stringify(incomeAfter));

  // Show all direct_bonus transactions
  const bonuses = await WalletTransaction.find({
    userId: new mongoose.Types.ObjectId(rootId),
    type: "direct_bonus",
  }).sort({ createdAt: 1 }).lean();
  console.log(`\nDirect bonus transactions: ${bonuses.length}`);
  for (const t of bonuses) {
    console.log(`  ${t.createdAt.toISOString()} | ${t.direction} $${t.amount} | ${t.memo ?? ""} | meta: ${JSON.stringify(t.meta ?? {})}`);
  }

  // Show all package_activation debits
  const activations = await WalletTransaction.find({
    userId: new mongoose.Types.ObjectId(rootId),
    type: "package_activation",
  }).sort({ createdAt: 1 }).lean();
  console.log(`\nPackage activation debits: ${activations.length}`);
  for (const t of activations) {
    console.log(`  ${t.createdAt.toISOString()} | ${t.direction} $${t.amount} | ${t.memo ?? ""}`);
  }

  // Active count
  const activeCount = await User.countDocuments({ status: "active", email: { $regex: new RegExp(`${EMAIL_DOMAIN}$`, "i") } });
  console.log(`\nTotal active tree users: ${activeCount}`);

  await mongoose.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });