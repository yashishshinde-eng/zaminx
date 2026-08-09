/**
 * End-to-end compensation-plan scenario — REAL SYSTEM edition.
 *
 * Runs against the REAL app database (MONGO_URI from server/.env, i.e. the
 * Atlas `zaminex` DB the running app uses) with the REAL seed config, so the
 * created users, $50 deposits, package activations, wallets, and every income
 * transaction land in the actual system — viewable in the app/admin panel just
 * like real-user activity. Does NOT drop or wipe anything; engines are idempotent.
 *
 *   npx tsx scenario-test.ts leader    # admin → Team Leader → 3 legs × 10 levels (DEFAULT)
 *   npx tsx scenario-test.ts leg       # 11-deep single leg
 *   npx tsx scenario-test.ts tree      # 3-direct-per-user tree
 *
 * Cleanup: npx tsx scenario-cleanup.ts  (deletes every @scenario.local user + their data)
 */

import dotenv from "dotenv";
dotenv.config(); // load server/.env (real MONGO_URI + JWT/secrets) — won't override existing env
process.env.CRON_ENABLED = "false"; // belt-and-suspenders; the scheduler isn't started here

import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const DOLLAR = 50;
const MODE = (process.argv[2] ?? "leader") as "leg" | "tree" | "leader";
const LEG_DEPTH = 11;
const TREE_BRANCH = 3;
const TREE_DEPTH = 3;
const LEADER_LEVELS = 10;
const EMAIL_DOMAIN = "@scenario.local"; // cleanup deletes every user with this email suffix

// Real seed defaults (mirror src/seed.ts) — created ONLY if missing in the DB.
const REAL_PACKAGE = {
  name: "Zeminex Global", slug: "zeminex-global",
  description: "One-time $50 package with 1–2% daily trading yield for 365 days.",
  priceUsd: 50, dailyReturnPct: 2.0, durationDays: 365,
  features: ["$50 one-time", "1–2% daily yield", "365-day term", "30% monthly cap"],
  sort: 1, status: "active",
};
const STAR_REWARDS = [10, 20, 50, 100, 250, 500, 1000, 2000, 5000, 10000];
const REAL_RANKS = [
  { name: "Starter", order: 0, requiredDirects: 0, requiredTeamSize: 0, rewardAmount: 0, status: "active", description: "Entry tier — every member starts here." },
  ...STAR_REWARDS.map((reward, i) => {
    const star = i + 1;
    return { name: `${star} Star`, order: star, requiredDirects: 0, requiredTeamSize: 3 ** star, rewardAmount: reward, status: "active" as const, description: `${star} Star — ${(3 ** star).toLocaleString()}-member team.` };
  }),
];
const REAL_BONANZA = {
  name: "Quick Start", requiredDirects: 3, rewardAmount: 10,
  startDate: new Date(), endDate: new Date(Date.now() + 90 * 86_400_000),
  status: "active", terms: "Refer 3 direct members during the offer window to earn a $10 bonus reward.",
};

async function main() {
  const mongoose = (await import("mongoose")).default;
  await mongoose.connect(process.env.MONGO_URI!);
  console.log(`✅ Connected to REAL DB: ${mongoose.connection.name} @ ${mongoose.connection.host}:${mongoose.connection.port}`);

  const { User, Package, Rank, BonanzaOffer, WalletTransaction, UserPackage, Deposit } = await import("./src/models/index.js");
  const { env } = await import("./src/config/env.js");
  const { registerUser } = await import("./src/services/auth.service.js");
  const { initiateWalletDeposit, confirmDeposit, activatePackageFromWallet } = await import("./src/services/deposit.service.js");
  const { runDailyYield, runDailyTeamEnergy, runMonthlyCommunityBonus, runBonanzaEvaluationAll } = await import("./src/services/compensation.service.js");
  const { runRankCheckAll } = await import("./src/services/rank.service.js");
  const { getWalletBalances } = await import("./src/services/wallet.service.js");

  // --- Ensure the real seed exists (idempotent — inserts only missing rows) ---
  let admin = await User.findOne({ email: env.SEED_ADMIN_EMAIL });
  if (!admin) {
    admin = await User.create({ name: env.SEED_ADMIN_NAME, email: env.SEED_ADMIN_EMAIL, password: env.SEED_ADMIN_PASSWORD, role: "admin", isEmailVerified: true });
    console.log(`✅ Created admin: ${admin.email}`);
  } else {
    console.log(`✅ Using existing admin: ${admin.email}  referralCode=${admin.referralCode}`);
  }
  const adminHasPackage = await UserPackage.exists({ user: admin._id, status: "active" });
  console.log(`   admin holds active package: ${!!adminHasPackage} (expected false → admin earns $0)`);

  let pkg = await Package.findOne({ slug: REAL_PACKAGE.slug });
  if (!pkg) { pkg = await Package.create(REAL_PACKAGE); console.log(`✅ Created package: ${pkg.name}`); }
  else console.log(`✅ Using existing package: ${pkg.name} ($${pkg.priceUsd}, ${pkg.dailyReturnPct}%/day, ${pkg.durationDays}d)`);
  const packageId = String(pkg._id);

  if ((await Rank.countDocuments({ status: "active" })) === 0) { await Rank.create(REAL_RANKS); console.log(`✅ Created rank ladder (${REAL_RANKS.length} rungs)`); }
  else console.log(`✅ Using existing rank ladder (${await Rank.countDocuments({ status: "active" })} active rungs)`);

  if (!(await BonanzaOffer.findOne({ name: REAL_BONANZA.name }))) { await BonanzaOffer.create(REAL_BONANZA); console.log(`✅ Created bonanza: ${REAL_BONANZA.name}`); }
  else console.log(`✅ Using existing bonanza: ${REAL_BONANZA.name}`);

  // --- Blast-radius: existing non-admin users (engines also process them) ---
  const existingUsers = await User.countDocuments({ role: { $ne: "admin" }, email: { $not: /@scenario\.local$/ } });
  const existingActivePackages = await UserPackage.countDocuments({ status: "active", user: { $ne: admin._id } });
  console.log(`ℹ️  Existing real (non-test) users in DB: ${existingUsers}; active packages among them: ${existingActivePackages}`);
  console.log(`   → Daily engines are idempotent (skip already-credited-today); community pays the current month if not already paid (idempotent).`);

  // --- Build the tree under admin ---
  type SUser = { label: string; userId: string; referralCode: string; level: number };
  const users: SUser[] = [];
  const adminRef = admin.referralCode;
  const rnd = () => Math.random().toString(36).slice(2);
  const emailFor = (label: string) => `${label}-${rnd()}${EMAIL_DOMAIN}`;

  if (MODE === "leg") {
    let sponsorRef = adminRef;
    for (let i = 1; i <= LEG_DEPTH; i++) {
      const { user } = await registerUser({ name: `U${i}`, email: emailFor(`u${i}`), password: "secret123", referralCode: sponsorRef });
      const u = await User.findById(user._id).lean();
      users.push({ label: `U${i}`, userId: user._id.toString(), referralCode: u!.referralCode, level: i });
      sponsorRef = u!.referralCode;
    }
    console.log(`✅ Registered ${LEG_DEPTH}-deep leg under admin`);
  } else if (MODE === "tree") {
    const queue: { ref: string; level: number }[] = [{ ref: adminRef, level: 0 }];
    let counter = 0;
    while (queue.length) {
      const node = queue.shift()!;
      if (node.level >= TREE_DEPTH) continue;
      for (let k = 0; k < TREE_BRANCH; k++) {
        counter++;
        const label = `L${node.level + 1}.${counter}`;
        const { user } = await registerUser({ name: label, email: emailFor(label), password: "secret123", referralCode: node.ref });
        const u = await User.findById(user._id).lean();
        users.push({ label, userId: user._id.toString(), referralCode: u!.referralCode, level: node.level + 1 });
        queue.push({ ref: u!.referralCode, level: node.level + 1 });
      }
    }
    console.log(`✅ Registered ${users.length}-user 3-wide tree under admin`);
  } else {
    const { user: tl } = await registerUser({ name: "Team Leader", email: emailFor("tl"), password: "secret123", referralCode: adminRef });
    const tlDoc = await User.findById(tl._id).lean();
    users.push({ label: "TL", userId: tl._id.toString(), referralCode: tlDoc!.referralCode, level: 0 });
    const legTips: Record<string, string> = { a: tlDoc!.referralCode, b: tlDoc!.referralCode, c: tlDoc!.referralCode };
    for (let lv = 1; lv <= LEADER_LEVELS; lv++) {
      for (const leg of ["a", "b", "c"]) {
        const label = `L${lv}.${leg}`;
        const { user } = await registerUser({ name: label, email: emailFor(label), password: "secret123", referralCode: legTips[leg] });
        const u = await User.findById(user._id).lean();
        users.push({ label, userId: user._id.toString(), referralCode: u!.referralCode, level: lv });
        legTips[leg] = u!.referralCode;
      }
    }
    console.log(`✅ Registered admin → Team Leader → 3 legs × ${LEADER_LEVELS} levels (${users.length - 1} users under TL)`);
  }

  // --- Activate top-to-bottom (array is already level-major / BFS order) ---
  for (const c of users) {
    const dep = await initiateWalletDeposit(c.userId, DOLLAR);
    await confirmDeposit(dep.id, `sandbox-payment-${dep.id}`);
    await activatePackageFromWallet(c.userId, packageId);
  }
  console.log(`✅ Deposited $50 + activated package for all ${users.length} users (top→bottom)`);

  // --- Run the compensation engines once (all idempotent) ---
  const y = await runDailyYield();
  const te = await runDailyTeamEnergy();
  const bn = await runBonanzaEvaluationAll();
  const rc = await runRankCheckAll();
  const cm = await runMonthlyCommunityBonus();
  console.log(`✅ run-yield:        processed=${y.processed} credited=${y.credited} skipped=${y.skipped} expired=${y.expired}`);
  console.log(`✅ run-team-energy:  processed=${te.processed} credited=${te.credited} skipped=${te.skipped}`);
  console.log(`✅ run-bonanza:      evaluated=${bn.evaluated} awarded=${bn.awarded}`);
  console.log(`✅ run-rank-check:   evaluated=${rc.evaluated} awarded=${rc.awarded}`);
  console.log(`✅ run-community:    month=${cm.month} processed=${cm.processed} credited=${cm.credited} skipped=${cm.skipped}`);

  // --- Balances + per-type breakdown, scoped to admin + the created users ---
  const allUsers = [{ label: "admin", userId: String(admin._id), level: 0 }, ...users];

  async function breakdownOf(userId: string) {
    const rows = (await WalletTransaction.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(userId) } },
      { $group: { _id: { type: "$type", dir: "$direction" }, total: { $sum: "$amount" }, count: { $sum: 1 } } },
    ])) as { _id: { type: string; dir: string }; total: number; count: number }[];
    const out: Record<string, { credit: number; debit: number; count: number }> = {};
    for (const r of rows) {
      const k = r._id.type;
      out[k] ??= { credit: 0, debit: 0, count: 0 };
      if (r._id.dir === "credit") out[k].credit += r.total; else out[k].debit += r.total;
      out[k].count += r.count;
    }
    return out;
  }

  const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
  const TYPES = ["direct_bonus", "trading_yield", "team_bonus", "community_bonus", "rank_reward", "bonanza"];
  type Row = { label: string; level: number; bal: { main: number; bonus: number; trading: number }; bd: Record<string, { credit: number; debit: number; count: number }> };
  const rows: Row[] = [];
  for (const u of allUsers) {
    const b = await getWalletBalances(u.userId);
    rows.push({ label: u.label, level: u.level, bal: { main: b.main.available, bonus: b.bonus.available, trading: b.trading.available }, bd: await breakdownOf(u.userId) });
  }

  // --- Console tables ---
  const pad = (s: string, n: number) => s.padEnd(n);
  console.log("\n================ WALLET BALANCES (available) ================");
  console.log(`${pad("User", 10)} ${pad("Main", 10)} ${pad("Bonus", 12)} ${pad("Trading", 10)}`);
  console.log("-".repeat(46));
  for (const r of rows) console.log(`${pad(r.label, 10)} ${pad("$" + r2(r.bal.main), 10)} ${pad("$" + r2(r.bal.bonus), 12)} ${pad("$" + r2(r.bal.trading), 10)}`);

  console.log("\n================ INCOME BREAKDOWN BY TYPE (net = credit − debit) ================");
  console.log(pad("User", 10) + TYPES.map((t) => pad(t, 16)).join(""));
  console.log("-".repeat(10 + TYPES.length * 16));
  for (const r of rows) {
    const cells = TYPES.map((t) => {
      const e = r.bd[t];
      if (!e) return pad("-", 16);
      const net = r2(e.credit - e.debit);
      return pad(`${net > 0 ? "+" : ""}$${net}`, 16);
    });
    console.log(pad(r.label, 10) + cells.join(""));
  }

  // --- Markdown report ---
  const md: string[] = [];
  md.push(`# Income Distribution — ${MODE} scenario (REAL SYSTEM)`);
  md.push("");
  md.push(`> Run against the real app database (\`${mongoose.connection.name}\` on \`${mongoose.connection.host}\`) using the live seed config. Every user, deposit, package activation, wallet balance, and income transaction below is a real document in the system — viewable in the app/admin panel. Generated ${new Date().toISOString().slice(0, 10)}.`);
  md.push("");
  md.push("## Scenario");
  md.push("");
  if (MODE === "leader") {
    md.push("Structure (each user deposited $50 → sandbox invoice → simulated paid → activated the $50 package, top-to-bottom):");
    md.push("");
    md.push("```");
    md.push("admin (root, no package — seeded admin@zeminex.local)");
    md.push("  └─ Team Leader (TL)");
    md.push("       ├─ Leg a: L1.a → L2.a → … → L10.a   (10 levels, 1 user each)");
    md.push("       ├─ Leg b: L1.b → L2.b → … → L10.b");
    md.push("       └─ Leg c: L1.c → L2.c → … → L10.c");
    md.push("```");
    md.push("");
    md.push(`Total users created: ${users.length} (1 Team Leader + 3 legs × 10 levels = 31), all sponsored under the real admin.`);
  } else if (MODE === "leg") {
    md.push(`Single ${LEG_DEPTH}-deep leg under the real admin (each deposited $50 + activated the $50 package, top→bottom). ${users.length} users created.`);
  } else {
    md.push(`3-direct-per-user tree, ${TREE_DEPTH} levels, BFS top→bottom (each deposited $50 + activated the $50 package). ${users.length} users created.`);
  }
  md.push("");
  md.push("Package: $50 one-time, 2% daily yield, 365-day term, 30%/month yield cap (the real seeded `Zeminex Global` package). Deposits run through the NOWPayments **sandbox** (no live gateway — `NOWPAYMENTS_API_KEY` is unset), so each deposit is simulated paid. All five compensation engines fired once (idempotent).");
  md.push("");
  md.push("## Engine run summary");
  md.push("");
  md.push("| Engine | Result |");
  md.push("|---|---|");
  md.push(`| run-yield | processed ${y.processed}, credited ${y.credited}, skipped ${y.skipped}, expired ${y.expired} |`);
  md.push(`| run-team-energy | processed ${te.processed}, credited ${te.credited}, skipped ${te.skipped} |`);
  md.push(`| run-bonanza | evaluated ${bn.evaluated}, awarded ${bn.awarded} |`);
  md.push(`| run-rank-check | evaluated ${rc.evaluated}, awarded ${rc.awarded} |`);
  md.push(`| run-community | month ${cm.month}, processed ${cm.processed}, credited ${cm.credited}, skipped ${cm.skipped} |`);
  md.push("");
  md.push("## Per-user income distribution");
  md.push("");
  md.push("`net = credit − debit` per income type, read from the **real `WalletTransaction` collection**. Wallets: **Main** = deposits/activations, **Bonus** = all bonuses, **Trading** = daily yield. (Main is $0 for every package holder: deposit +$50 then activation −$50.)");
  md.push("");
  md.push("| User | Level | Direct bonus | Team energy | Trade yield | Community (mo) | Rank reward | Bonanza | Bonus wallet | Trading | Main |");
  md.push("|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|");
  const cell = (bd: Row["bd"], t: string) => {
    const e = bd[t];
    if (!e) return "—";
    const net = r2(e.credit - e.debit);
    if (net === 0 && e.count === 0) return "—";
    return `${net > 0 ? "+" : ""}$${net}`;
  };
  for (const r of rows) {
    md.push(`| ${r.label} | ${r.level} | ${cell(r.bd, "direct_bonus")} | ${cell(r.bd, "team_bonus")} | ${cell(r.bd, "trading_yield")} | ${cell(r.bd, "community_bonus")} | ${cell(r.bd, "rank_reward")} | ${cell(r.bd, "bonanza")} | $${r2(r.bal.bonus)} | $${r2(r.bal.trading)} | $${r2(r.bal.main)} |`);
  }
  md.push("");
  md.push("## Notes");
  md.push("");
  md.push("- Trade yield & team energy are **one-day** figures (engines fired once). Yield is capped at 30%/month of the package price ($15/mo); team energy accrues daily up to 10 levels upline.");
  md.push("- Community bonus is **monthly** (paid on the 10th). Rank reward & bonanza are **one-time** and idempotent — re-running the same period does not double-pay.");
  md.push("- Anti-farming: direct bonus, community, rank reward, and bonanza all require the earner to hold an **active package**. The admin (root, no package) earns nothing.");
  md.push("- Bonanza (Quick Start: 3 directs → $10) fires only for users with ≥3 directs and an active package — here, only the Team Leader (3 directs: L1.a/b/c).");
  md.push("");
  md.push("## Cleanup");
  md.push("");
  md.push(`All ${users.length} created users use the email suffix \`${EMAIL_DOMAIN}\`. Remove them and their data from the real system with:`);
  md.push("");
  md.push("```bash");
  md.push("npx tsx scenario-cleanup.ts");
  md.push("```");

  const outPath = resolve(process.cwd(), `../income-distribution-${MODE}.md`);
  writeFileSync(outPath, md.join("\n"), "utf8");
  console.log(`\n📝 Wrote ${outPath}`);

  // --- Cleanup helper output ---
  console.log(`\n🧹 To undo, run: npx tsx scenario-cleanup.ts  (deletes every ${EMAIL_DOMAIN} user + packages/transactions/deposits)`);
  console.log(`   Created ${users.length} users (${users.length + 1} rows incl. admin in the report).`);

  await mongoose.disconnect();
  console.log("✅ Done.");
}

main().catch((e) => {
  console.error("SCENARIO FAILED:", e?.stack || e);
  process.exit(1);
});