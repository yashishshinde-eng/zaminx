import { connectDB } from "./config/db.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { User, Setting, CmsPage } from "./models/index.js";
import type { ContentBlock } from "@zaminex/shared";

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
    });
    await admin.save();
    logger.info(`✅ Admin user created: ${admin.email} (referralCode: ${admin.referralCode})`);
  }

  // --- Site settings (values align directly with SiteConfig field shapes) ---
  const defaults = [
    { key: "cms.siteName", value: "Zaminex", category: "cms", isPublic: true },
    { key: "cms.tagline", value: "Modern arbitrage investment platform", category: "cms", isPublic: true },
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
      value: "© 2026 Zaminex. Built per the master blueprint.",
      category: "cms",
      isPublic: true,
    },
    {
      key: "cms.contactDetails",
      value: {
        email: "support@zaminex.io",
        phone: "+1 (555) 010-2026",
        address: "Suite 1, Privacy Tower, Offshore",
      },
      category: "cms",
      isPublic: true,
    },
    {
      key: "cms.socialLinks",
      value: { twitter: "https://twitter.com/zaminex", telegram: "https://t.me/zaminex" },
      category: "cms",
      isPublic: true,
    },
    {
      key: "cms.seoDefaults",
      value: {
        title: "Zaminex — Modern Arbitrage Investment Platform",
        description:
          "Earn daily trading yields, referral rewards, and community bonuses on a secure, scalable investment platform.",
      },
      category: "cms",
      isPublic: true,
    },
    { key: "cms.announcementBar", value: { enabled: false, message: "" }, category: "cms", isPublic: true },
    { key: "general.maintenanceMode", value: { enabled: false, message: "" }, category: "general", isPublic: true },
    { key: "smtp.configured", value: false, category: "smtp", isPublic: false },
    { key: "payment.configured", value: false, category: "payment", isPublic: false },
  ];

  for (const d of defaults) {
    const exists = await Setting.findOne({ key: d.key });
    if (!exists) await Setting.create(d);
  }
  logger.info(`✅ Default settings ensured (${defaults.length} keys)`);

  // --- Default CMS pages (idempotent on slug) ---
  await Promise.all(
    DEFAULT_PAGES.map(async (p) => {
      const exists = await CmsPage.findOne({ slug: p.slug });
      if (exists) return;
      await CmsPage.create(p);
    }),
  );
  logger.info(`✅ Default CMS pages ensured (${DEFAULT_PAGES.length} pages)`);

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

const DEFAULT_PAGES = [
  {
    slug: "home",
    title: "Zaminex — Invest smarter",
    status: "published",
    publishedAt: new Date(),
    seo: {
      title: "Zaminex — Modern Arbitrage Investment Platform",
      description:
        "Earn daily trading yields, referral rewards, and community bonuses on a secure, scalable investment platform.",
    },
    blocks: [
      hero(
        "Invest smarter with a modern arbitrage platform",
        "Secure, scalable, and built for performance — trading yields, referral rewards, and a premium experience.",
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
    title: "About Zaminex",
    status: "published",
    publishedAt: new Date(),
    seo: { title: "About — Zaminex", description: "Learn about the Zaminex platform, its mission, and how it works." },
    blocks: [
      hero("About Zaminex", "A modern arbitrage investment platform built for the long term.", "View compensation plan", "/compensation-plan"),
      paragraph(
        "Zaminex is a secure, scalable investment platform inspired by modern arbitrage platforms. We combine automated trading yields with a multi-tier referral rewards system, wrapped in a premium, fully responsive experience with light and dark themes.",
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
    seo: { title: "Compensation Plan — Zaminex", description: "Six income streams: trade yield, direct, team, community, rank, and bonanza." },
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
    seo: { title: "FAQ — Zaminex", description: "Answers to common questions about the Zaminex platform." },
    blocks: [
      heading("Frequently asked questions"),
      {
        type: "faq",
        items: [
          { question: "How do I start earning?", answer: "Create an account, activate a package, and your daily trading yield begins. Share your referral link to earn bonuses." },
          { question: "How are withdrawals handled?", answer: "Withdrawals are submitted by users and manually approved by admins. Funds move to 'on hold' until approved and paid." },
          { question: "What is the Bonanza engine?", answer: "Bonanza offers are dynamic, admin-configured rewards — e.g. bring 3 direct referrals to earn $10. They run within a start/end window." },
          { question: "Is there a minimum package?", answer: "Package tiers are configurable by admins. You'll see available packages in your dashboard after registration." },
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
    seo: { title: "Terms of Service — Zaminex", description: "The terms governing use of the Zaminex platform." },
    blocks: [
      heading("Terms of Service", 1),
      paragraph("These terms govern your use of the Zaminex platform. By creating an account you agree to them."),
      heading("1. Eligibility", 2),
      paragraph("You must be of legal age in your jurisdiction to participate. You are responsible for any activity under your account."),
      heading("2. Accounts & security", 2),
      paragraph("Keep your credentials secure. We use JWT-based authentication and rate limiting to protect accounts. Notify us immediately of any unauthorized access."),
      heading("3. Packages & earnings", 2),
      paragraph("Earnings depend on platform performance and are not guaranteed. Trading yields, bonuses, and rewards are credited per the compensation plan and are subject to change."),
      heading("4. Withdrawals", 2),
      paragraph("Withdrawals require manual admin approval. The platform reserves the right to review, reject, or delay withdrawals per compliance checks."),
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
    seo: { title: "Privacy Policy — Zaminex", description: "How Zaminex collects, uses, and protects your data." },
    blocks: [
      heading("Privacy Policy", 1),
      paragraph("This policy describes how Zaminex handles your personal information."),
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