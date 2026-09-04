import { connectDB } from "./config/db.js";
import { env, isNowpaymentsConfigured } from "./config/env.js";
import { logger } from "./config/logger.js";
import { User, Setting, CmsPage, Package, BonanzaOffer, Rank } from "./models/index.js";
import type { ContentBlock } from "@zeminex/shared";

async function seed() {
  await connectDB();

  // --- Admin user ---
  const existing = await User.findOne({ email: env.SEED_ADMIN_EMAIL });
  if (existing) {
    logger.info(`Admin user already exists: ${env.SEED_ADMIN_EMAIL}`);
  } else {
    const admin = new User({
      name: env.SEED_ADMIN_NAME,
      email: env.SEED_ADMIN_EMAIL,
      password: env.SEED_ADMIN_PASSWORD,
      role: "admin",
      isEmailVerified: true,
      themePreference: "dark",
      status: "active", // root sponsor + admin must be active (new users default to inactive)
    });
    await admin.save();
    logger.info(`✅ Admin user created: ${admin.email} (referralCode: ${admin.referralCode})`);
  }

  // When true, seed upserts (overwrites) settings/packages/ranks/CMS pages and
  // retires legacy tiers/rungs — a one-time migration to sync the live DB after a
  // spec change. When false (default), seed only inserts missing rows and never
  // clobbers admin edits.
  const forceSync = env.SEED_FORCE_SYNC;

  // --- Site settings (values align directly with SiteConfig field shapes) ---
  const defaults = [
    { key: "cms.siteName", value: "Zeminex Global", category: "cms", isPublic: true },
    { key: "cms.website", value: "https://zeminexglobal.com", category: "cms", isPublic: true },
    { key: "cms.tagline", value: "AI arbitrage + community rewards", category: "cms", isPublic: true },
    { key: "cms.logoLight", value: null, category: "cms", isPublic: true },
    { key: "cms.logoDark", value: null, category: "cms", isPublic: true },
    {
      key: "cms.navLinks",
      value: [
        { label: "Home", href: "/" },
        { label: "About", href: "/about" },
        { label: "Compensation Plan", href: "/compensation-plan" },
        { label: "FAQ", href: "/faq" },
        { label: "Contact", href: "/contact" },
      ],
      category: "cms",
      isPublic: true,
    },
    {
      key: "cms.footerText",
      value: "© 2026 Zeminex Global. AI arbitrage + community rewards.",
      category: "cms",
      isPublic: true,
    },
    {
      key: "cms.contactDetails",
      value: {
        email: "support@zeminexglobal.com",
        phone: "+1 (555) 010-2026",
        address: "Suite 1, Privacy Tower, Offshore",
      },
      category: "cms",
      isPublic: true,
    },
    {
      key: "cms.socialLinks",
      value: { twitter: "https://twitter.com/zeminexglobal", telegram: "https://t.me/zeminexglobal" },
      category: "cms",
      isPublic: true,
    },
    {
      key: "cms.seoDefaults",
      value: {
        title: "Zeminex Global — AI Arbitrage Investment Platform",
        description:
          "Earn 1–2% daily trading yield on a one-time $50 package with a 365-day term, plus referral, team, rank, and community rewards.",
      },
      category: "cms",
      isPublic: true,
    },
    { key: "cms.announcementBar", value: { enabled: false, message: "" }, category: "cms", isPublic: true },
    { key: "general.maintenanceMode", value: { enabled: false, message: "" }, category: "general", isPublic: true },
    // Phase 14B: non-secret SMTP fields (admin-editable; secrets stay env-only).
    // Seeded from env so existing env-driven setups keep working unchanged.
    { key: "smtp.host", value: env.SMTP_HOST ?? "", category: "smtp", isPublic: false },
    { key: "smtp.port", value: env.SMTP_PORT, category: "smtp", isPublic: false },
    { key: "smtp.from", value: env.SMTP_FROM, category: "smtp", isPublic: false },
    // Phase 14B: non-secret NOWPayments fields (admin-editable; secrets env-only).
    { key: "payment.baseUrl", value: env.NOWPAYMENTS_BASE_URL, category: "payment", isPublic: false },
    { key: "payment.payCurrency", value: env.NOWPAYMENTS_PAY_CURRENCY, category: "payment", isPublic: false },
    { key: "payment.sandbox", value: !isNowpaymentsConfigured(), category: "payment", isPublic: false },
    // Compensation defaults (private — admin-tunable).
    { key: "compensation.directBonusPct", value: 10, category: "compensation", isPublic: false },
    { key: "compensation.yieldEnabled", value: true, category: "compensation", isPublic: false },
    // Max total yield credited per calendar month, as % of package price (0 = no cap).
    { key: "compensation.monthlyYieldCapPct", value: 30, category: "compensation", isPublic: false },
    { key: "compensation.teamEnergyEnabled", value: true, category: "compensation", isPublic: false },
    { key: "compensation.teamEnergyDepth", value: 10, category: "compensation", isPublic: false },
    { key: "compensation.teamEnergyPct", value: [10, 5, 4, 3, 2, 1, 0.5, 0.5, 0.25, 0.25], category: "compensation", isPublic: false },
    { key: "compensation.communityEnabled", value: true, category: "compensation", isPublic: false },
    { key: "compensation.communityPct", value: 5, category: "compensation", isPublic: false },
  ];

  for (const d of defaults) {
    if (forceSync) {
      await Setting.findOneAndUpdate(
        { key: d.key },
        { $set: { key: d.key, value: d.value, category: d.category, isPublic: d.isPublic } },
        { upsert: true },
      );
    } else {
      const exists = await Setting.findOne({ key: d.key });
      if (!exists) await Setting.create(d);
    }
  }
  logger.info(`✅ Default settings ensured (${defaults.length} keys)${forceSync ? " [force-sync]" : ""}`);

  // --- Default CMS pages (upsert on slug when force-syncing) ---
  await Promise.all(
    DEFAULT_PAGES.map(async (p) => {
      if (forceSync) {
        await CmsPage.findOneAndUpdate(
          { slug: p.slug },
          { $set: { title: p.title, status: p.status, publishedAt: p.publishedAt, seo: p.seo, blocks: p.blocks } },
          { upsert: true },
        );
      } else {
        const exists = await CmsPage.findOne({ slug: p.slug });
        if (exists) return;
        await CmsPage.create(p);
      }
    }),
  );
  logger.info(`✅ Default CMS pages ensured (${DEFAULT_PAGES.length} pages)${forceSync ? " [force-sync]" : ""}`);

  // --- Default package tiers (investment catalog), upsert on slug when force-syncing ---
  await Promise.all(
    DEFAULT_PACKAGES.map(async (p) => {
      if (forceSync) {
        await Package.findOneAndUpdate({ slug: p.slug }, { $set: p }, { upsert: true });
      } else {
        const exists = await Package.findOne({ slug: p.slug });
        if (exists) return;
        await Package.create(p);
      }
    }),
  );
  // Retire legacy tiered packages so the catalog shows only the $50 365-day package.
  // Historical UserPackage snapshots are unaffected (terms are immutable at activation).
  if (forceSync) {
    await Package.updateMany(
      { slug: { $in: ["starter", "silver", "gold", "platinum"] } },
      { $set: { status: "inactive" } },
    );
  }
  logger.info(`✅ Default package tiers ensured (${DEFAULT_PACKAGES.length} tiers)${forceSync ? " [force-sync]" : ""}`);

  // --- Example bonanza offer (Phase 10), idempotent on name ---
  await (async () => {
    const exists = await BonanzaOffer.findOne({ name: DEFAULT_BONANZA.name });
    if (exists) return;
    await BonanzaOffer.create(DEFAULT_BONANZA);
  })();
  logger.info("✅ Default bonanza offer ensured");

  // --- Default rank ladder (Phase 10A), upsert on name when force-syncing ---
  await Promise.all(
    DEFAULT_RANKS.map(async (r) => {
      if (forceSync) {
        await Rank.findOneAndUpdate({ name: r.name }, { $set: r }, { upsert: true });
      } else {
        const exists = await Rank.findOne({ name: r.name });
        if (exists) return;
        await Rank.create(r);
      }
    }),
  );
  // Retire legacy rank rungs (Bronze/Silver/Gold/Platinum) so the ladder is the
  // 10-star team-size ladder. Historical `rank:<rankId>:<userId>` ledger
  // references are preserved (rows stay, just inactive).
  if (forceSync) {
    const keepNames = DEFAULT_RANKS.map((r) => r.name);
    await Rank.updateMany({ name: { $nin: keepNames } }, { $set: { status: "inactive" } });
  }
  logger.info(`✅ Default rank ladder ensured (${DEFAULT_RANKS.length} ranks)${forceSync ? " [force-sync]" : ""}`);

  logger.info("Seed complete.");
  process.exit(0);
}

/* -------------------------------------------------------------------------- */
/*  Default page content — structured blocks.                                 */
/* -------------------------------------------------------------------------- */

const hero = (title: string, subtitle: string, ctaLabel: string, ctaHref: string): ContentBlock => ({
  type: "hero",
  title,
  subtitle,
  ctaLabel,
  ctaHref,
});

const heading = (text: string, level: 1 | 2 | 3 = 2): ContentBlock => ({ type: "heading", level, text });
const paragraph = (text: string): ContentBlock => ({ type: "paragraph", text });
const cta = (title: string, description: string, ctaLabel: string, ctaHref: string): ContentBlock => ({
  type: "cta",
  title,
  description,
  ctaLabel,
  ctaHref,
});

/** Example bonanza offer so the engine is exercisable in dev (Phase 10). */
const DEFAULT_BONANZA = {
  name: "Quick Start",
  requiredDirects: 3,
  rewardAmount: 10,
  startDate: new Date(),
  endDate: new Date(Date.now() + 90 * 86_400_000),
  status: "active",
  terms: "Refer 3 direct members during the offer window to earn a $10 bonus reward.",
};

/**
 * Default rank ladder (Phase 10A). Starter is the entry tier (0/0, $0); each
 * star is team-size only (requiredDirects: 0) and pays a one-time reward on
 * qualification. Star N requires a team of 3^N (3,9,27,…,59049). The same
 * 10-star reward ladder ($10…$10,000) is reused by the monthly community bonus.
 * Admin-editable via the /ranks endpoints.
 */
const STAR_REWARDS = [10, 20, 50, 100, 250, 500, 1000, 2000, 5000, 10000];
const DEFAULT_RANKS = [
  { name: "Starter", order: 0, requiredDirects: 0, requiredTeamSize: 0, rewardAmount: 0, status: "active", description: "Entry tier — every member starts here." },
  ...STAR_REWARDS.map((reward, i) => {
    const star = i + 1;
    const teamSize = 3 ** star;
    return {
      name: `${star} Star`,
      order: star,
      requiredDirects: 0,
      requiredTeamSize: teamSize,
      rewardAmount: reward,
      status: "active" as const,
      description: `${star} Star — ${teamSize.toLocaleString()}-member team.`,
    };
  }),
];

const DEFAULT_PACKAGES = [
  {
    name: "Zeminex Global",
    slug: "zeminex-global",
    description: "One-time $50 package with 1–2% daily trading yield.",
    priceUsd: 50,
    dailyReturnPct: 2.0,
    durationDays: 365,
    features: ["$50 one-time", "1–2% daily yield", "30% monthly cap"],
    sort: 1,
    status: "active",
  },
];

const DEFAULT_PAGES = [
  {
    slug: "home",
    title: "Zeminex Global — Invest smarter",
    status: "published",
    publishedAt: new Date(),
    seo: {
      title: "Zeminex Global — AI Arbitrage Investment Platform",
      description:
        "Earn 1–2% daily trading yield on a one-time $50 lifetime package, plus referral, team, rank, and community rewards.",
    },
    blocks: [
      hero(
        "Invest smarter with an AI arbitrage platform",
        "One-time $50 package, 1–2% daily yield, 365-day term, and a 10-star community rewards ladder.",
        "Create your account",
        "/register",
      ),
      {
        type: "features",
        items: [
          { title: "Daily Trading Yield", description: "Earn 1–2% daily from automated arbitrage strategies.", icon: "TrendingUp" },
          { title: "Referral Rewards", description: "Direct connect bonuses, team energy, and community income.", icon: "Users" },
          { title: "Secure Wallet", description: "Multi-currency wallet with an immutable financial ledger.", icon: "Wallet" },
          { title: "Bank-Grade Security", description: "JWT auth, rate limiting, and audited withdrawals.", icon: "ShieldCheck" },
        ],
      } as ContentBlock,
      cta("Ready to start earning?", "Create your free account in minutes.", "Get started", "/register"),
    ] as ContentBlock[],
  },
  {
    slug: "about",
    title: "About Zeminex Global",
    status: "published",
    publishedAt: new Date(),
    seo: { title: "About — Zeminex Global", description: "Learn about the Zeminex Global platform, its mission, and how it works." },
    blocks: [
      hero("About Zeminex Global", "An AI arbitrage investment platform built for the long term.", "View compensation plan", "/compensation-plan"),
      paragraph(
        "Zeminex Global is a secure, scalable investment platform powered by AI arbitrage. We combine automated trading yields with a 10-star community rewards system, wrapped in a premium, fully responsive experience with light and dark themes.",
      ),
      heading("Our principles"),
      {
        type: "features",
        items: [
          { title: "Transparency", description: "An immutable financial ledger records every transaction.", icon: "ScrollText" },
          { title: "Performance", description: "Optimized queries, background jobs, and lazy loading.", icon: "Zap" },
          { title: "Security first", description: "Manual withdrawal approval and audited access control.", icon: "ShieldCheck" },
        ],
      } as ContentBlock,
    ] as ContentBlock[],
  },
  {
    slug: "compensation-plan",
    title: "Compensation Plan",
    status: "published",
    publishedAt: new Date(),
    seo: { title: "Compensation Plan — Zeminex Global", description: "Six income streams: trade yield, direct, team, community, rank, and bonanza." },
    blocks: [
      hero("Compensation Plan", "Six income streams designed to reward activity and growth.", "Get started", "/register"),
      heading("Income streams"),
      {
        type: "steps",
        items: [
          { title: "1. Trade Yield (1–2% daily)", description: "Automated arbitrage yields credited daily to your trading wallet." },
          { title: "2. Direct Connect Bonus (10%)", description: "Earn 10% on every direct referral's package activation." },
          { title: "3. Daily Team Energy Bonus", description: "Build a team and earn from team energy, paid daily." },
          { title: "4. Community Monthly Bonus", description: "A monthly bonus tied to your community's performance." },
          { title: "5. Rank Reward Bonus", description: "Climb the ranks to unlock milestone reward payouts." },
          { title: "6. Bonanza Offer Engine", description: "Dynamic, time-limited offers (e.g. 3 directs → $10). Fully admin-configurable." },
        ],
      } as ContentBlock,
      paragraph("All income is tracked on an immutable ledger with automatic wallet credit, notifications, and email alerts."),
      cta("Ready to build your team?", "Create your account and share your referral link.", "Create account", "/register"),
    ] as ContentBlock[],
  },
  {
    slug: "faq",
    title: "Frequently Asked Questions",
    status: "published",
    publishedAt: new Date(),
    seo: { title: "FAQ — Zeminex Global", description: "Answers to common questions about the Zeminex Global platform." },
    blocks: [
      heading("Frequently asked questions"),
      {
        type: "faq",
        items: [
          { question: "How do I start earning?", answer: "Create an account, activate a package, and your daily trading yield begins. Share your referral link to earn bonuses." },
          { question: "How are withdrawals handled?", answer: "Withdrawals are auto-approved on submit (min $15) and credited immediately; the on-chain USDT payout is processed shortly after." },
          { question: "What is the Bonanza engine?", answer: "Bonanza offers are dynamic, admin-configured rewards — e.g. bring 3 direct referrals to earn $10. They run within a start/end window." },
          { question: "Is there a minimum package?", answer: "There is a single one-time $50 package with a 365-day term. You'll see it in your dashboard after registration." },
          { question: "Do you support light and dark themes?", answer: "Yes — the platform fully supports both, and your preference is saved to your account." },
        ],
      } as ContentBlock,
    ] as ContentBlock[],
  },
  {
    slug: "terms",
    title: "Terms of Service",
    status: "published",
    publishedAt: new Date(),
    seo: { title: "Terms of Service — Zeminex Global", description: "The terms governing use of the Zeminex Global platform." },
    blocks: [
      heading("Terms of Service", 1),
      paragraph("These terms govern your use of the Zeminex Global platform. By creating an account you agree to them."),
      heading("1. Eligibility", 2),
      paragraph("You must be of legal age in your jurisdiction to participate. You are responsible for any activity under your account."),
      heading("2. Accounts & security", 2),
      paragraph("Keep your credentials secure. We use JWT-based authentication and rate limiting to protect accounts. Notify us immediately of any unauthorized access."),
      heading("3. Packages & earnings", 2),
      paragraph("Earnings depend on platform performance and are not guaranteed. Trading yields, bonuses, and rewards are credited per the compensation plan and are subject to change."),
      heading("4. Withdrawals", 2),
      paragraph("Withdrawals are auto-approved on submit (minimum $15) and credited immediately; the on-chain USDT payout is processed shortly after. The platform reserves the right to review, reject, or delay withdrawals per compliance checks."),
      heading("5. Termination", 2),
      paragraph("We may suspend or terminate accounts that violate these terms or engage in fraudulent activity."),
      paragraph("This is sample text seeded for the foundation. Replace it with your final legal terms before launch."),
    ] as ContentBlock[],
  },
  {
    slug: "privacy",
    title: "Privacy Policy",
    status: "published",
    publishedAt: new Date(),
    seo: { title: "Privacy Policy — Zeminex Global", description: "How Zeminex Global collects, uses, and protects your data." },
    blocks: [
      heading("Privacy Policy", 1),
      paragraph("This policy describes how Zeminex Global handles your personal information."),
      heading("1. Data we collect", 2),
      paragraph("We collect the information you provide at registration (name, email, phone), your wallet addresses, and activity logs required to operate the platform."),
      heading("2. How we use it", 2),
      paragraph("To authenticate you, process deposits and withdrawals, compute earnings, send notifications, and comply with legal obligations."),
      heading("3. Security", 2),
      paragraph("Passwords are hashed with bcrypt. Access is JWT-guarded. Financial operations run inside MongoDB transactions on an immutable ledger."),
      heading("4. Your rights", 2),
      paragraph("You may request access to or deletion of your data. Contact us via the contact page to exercise these rights."),
      paragraph("This is sample text seeded for the foundation. Replace it with your final privacy policy before launch."),
    ] as ContentBlock[],
  },
];

seed().catch((err) => {
  logger.error("Seed failed", { error: err instanceof Error ? err.message : String(err) });
  process.exit(1);
});