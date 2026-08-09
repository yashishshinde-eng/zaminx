/**
 * LandingPage — Premium FinTech Landing
 *
 * A visually stunning, award-winning landing page for Zeminex Global.
 * Every section has visual depth, glassmorphism, animations, and a $100M FinTech feel.
 * Think: Stripe + Binance + Linear + Apple — no flat sections, every pixel has purpose.
 */

import { useState, useRef, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { motion, useInView, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  TrendingUp,
  Zap,
  Users,
  Lock,
  Globe,
  BarChart3,
  ArrowRight,
  ChevronDown,
  Star,
  Wallet,
  Bitcoin,
  LineChart,
  Coins,
  Sparkles,
  CheckCircle2,
  Activity,
  CircleDot,
  Eye,
  Server,
  Award,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/layout/Logo";

/* ─── Animation variants ────────────────────────────────────────── */
const fadeUp = {
  hidden: { opacity: 1, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
};
const stagger = {
  visible: { transition: { staggerChildren: 0.08 } },
};

/* ─── Section wrapper with entrance animation ──────────────────── */
function Section({
  children,
  className,
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.section
      id={id}
      ref={ref}
      variants={fadeUp}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      className={className}
    >
      {children}
    </motion.section>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *  1. HERO SECTION — The most important section
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function HeroSection() {
  const stats = [
    { label: "Active Users", value: "50K+" },
    { label: "Total Invested", value: "$120M+" },
    { label: "Countries", value: "45+" },
    { label: "Uptime", value: "99.9%" },
  ];

  return (
    <section className="hero-bg noise-overlay grid-pattern relative min-h-[100vh] overflow-hidden pt-24 pb-20 sm:pt-32 sm:pb-28">
      {/* ── Floating orbs ────────────────────────────────────────── */}
      <div className="glow-orb left-[5%] top-[10%] size-[500px] bg-blue/20" />
      <div className="glow-orb right-[-10%] bottom-[5%] size-[600px] bg-blue/15" />
      <div className="glow-orb left-[40%] top-[60%] size-[300px] bg-blue/10" />

      {/* ── Rotating orbit ring behind dashboard ───────────────────── */}
      <div className="absolute right-[-5%] top-[8%] hidden h-[700px] w-[700px] xl:block">
        <div className="animate-rotate-slow absolute inset-0 rounded-full border border-blue/10" />
        <div className="animate-rotate-slow absolute inset-8 rounded-full border border-blue/10" style={{ animationDuration: "25s", animationDirection: "reverse" }} />
        <div className="animate-orbit absolute left-1/2 top-0 size-3 rounded-full bg-blue shadow-glow-blue" />
      </div>

      <div className="container relative z-10 mx-auto">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 xl:gap-24">
          {/* ── Left: Copy ─────────────────────────────────────────── */}
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="visible"
            className="flex flex-col justify-center"
          >
            <motion.div variants={fadeUp} className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue/20 bg-blue/5 px-4 py-1.5 text-sm font-medium text-gold backdrop-blur-sm">
              <Sparkles className="size-4" />
              Next-Gen Investment Platform
            </motion.div>

            <motion.h1 variants={fadeUp} className="font-grotesk text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl xl:text-7xl">
              Grow Your Wealth
              <br />
              <span className="hero-gradient-text">With Confidence</span>
            </motion.h1>

            <motion.p variants={fadeUp} className="mt-6 max-w-lg text-lg text-muted-foreground sm:text-xl">
              Zeminex Global empowers you with institutional-grade investment tools, real-time portfolio analytics, and bank-level security — all in one premium platform.
            </motion.p>

            <motion.div variants={fadeUp} className="mt-8 flex flex-wrap gap-4">
              <Link to="/register" className="btn-premium h-12 px-8 text-base">
                Get Started <ArrowRight className="size-4" />
              </Link>
              <Link to="/about" className="btn-secondary-premium h-12 px-8 text-base">
                Learn More
              </Link>
            </motion.div>

            {/* Trust badges */}
            <motion.div variants={fadeUp} className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5"><CheckCircle2 className="size-4 text-success" /> SOC2 Compliant</span>
              <span className="flex items-center gap-1.5"><Lock className="size-4 text-gold" /> 256-bit Encryption</span>
              <span className="flex items-center gap-1.5"><ShieldCheck className="size-4 text-gold" /> Insured Funds</span>
            </motion.div>
          </motion.div>

          {/* ── Right: Floating Dashboard ──────────────────────────── */}
          <motion.div
            initial={{ opacity: 1, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
            className="relative hidden lg:block"
          >
            {/* Main dashboard card */}
            <div className="animate-float mockup-card relative p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="gradient-blue flex size-10 items-center justify-center rounded-xl text-primary-foreground font-bold shadow-glow-blue">
                    Z
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Portfolio Value</p>
                    <p className="text-2xl font-bold tabular-nums">$127,492.38</p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-1 text-xs font-semibold text-success">
                  <TrendingUp className="size-3" /> +12.4%
                </span>
              </div>

              {/* Mini chart bars */}
              <div className="flex items-end gap-1.5 h-24 mb-4">
                {[40, 55, 35, 60, 48, 70, 52, 65, 45, 75, 58, 80, 68, 85, 72, 90, 78, 95, 82, 88].map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-t-sm gradient-blue opacity-80"
                    style={{ height: `${h}%`, transition: "height 0.3s ease" }}
                  />
                ))}
              </div>

              {/* Wallet tiles */}
              <div className="grid grid-cols-3 gap-3 mt-2">
                {[
                  { label: "Main", value: "$84,230", icon: Wallet },
                  { label: "Bonus", value: "$28,912", icon: Award },
                  { label: "Trading", value: "$14,350", icon: LineChart },
                ].map((t) => (
                  <div key={t.label} className="glass-card rounded-xl p-3 text-center">
                    <t.icon className="mx-auto size-4 text-gold" />
                    <p className="mt-1 text-[10px] font-medium text-muted-foreground">{t.label}</p>
                    <p className="text-xs font-bold tabular-nums">{t.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Floating notification cards */}
            <div className="float-notification animate-float-delayed left-[-8%] top-[12%] z-20">
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-lg bg-success/15 text-success">
                  <TrendingUp className="size-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold">+2,450 USDT</p>
                  <p className="text-[10px] text-muted-foreground">Trading profit</p>
                </div>
              </div>
            </div>

            <div className="float-notification animate-float-slow right-[-5%] bottom-[18%] z-20">
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-lg bg-gold/15 text-gold">
                  <Bitcoin className="size-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold">BTC/USDT</p>
                  <p className="text-[10px] text-success">+5.2%</p>
                </div>
              </div>
            </div>

            <div className="float-notification animate-float left-[15%] bottom-[-5%] z-20">
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-lg bg-gold/15 text-gold">
                  <ShieldCheck className="size-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold">Secured</p>
                  <p className="text-[10px] text-muted-foreground">256-bit encryption</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* ── Stats bar ────────────────────────────────────────────── */}
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="visible"
          className="mt-20 grid grid-cols-2 gap-6 sm:grid-cols-4"
        >
          {stats.map((s) => (
            <motion.div key={s.label} variants={fadeUp} className="stat-card">
              <p className="hero-gradient-text text-2xl font-bold sm:text-3xl">{s.value}</p>
              <p className="mt-1 text-sm text-muted-foreground">{s.label}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *  2. PARTNERS — Premium logos
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function PartnersSection() {
  const partners = [
    "Binance", "CoinGecko", "CoinMarketCap", "NowPayments", "Cloudflare", "AWS",
  ];
  return (
    <Section className="section-bg py-16 sm:py-20">
      <div className="container mx-auto text-center">
        <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Trusted by industry leaders</p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-8 sm:gap-12">
          {partners.map((name) => (
            <div key={name} className="partner-logo flex items-center gap-2 text-lg font-bold text-muted-foreground/60 hover:text-gold transition-all duration-300">
              <CircleDot className="size-5" /> {name}
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *  3. FEATURES — Modern glassmorphism cards
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function FeaturesSection() {
  const features = [
    { icon: TrendingUp, title: "Smart Analytics", desc: "Real-time portfolio tracking with institutional-grade analytics and actionable insights." },
    { icon: ShieldCheck, title: "Bank-Level Security", desc: "256-bit encryption, SOC2 compliance, and multi-factor authentication protect every transaction." },
    { icon: Zap, title: "Instant Execution", desc: "Lightning-fast order execution with zero-latency infrastructure across global markets." },
    { icon: Wallet, title: "Multi-Wallet System", desc: "Separate Main, Bonus, and Trading wallets with instant transfers and crystal-clear tracking." },
    { icon: Globe, title: "Global Access", desc: "Available in 45+ countries with localized support and multi-currency capabilities." },
    { icon: Users, title: "Referral Network", desc: "Build your team and earn commissions through our powerful multi-tier referral system." },
  ];

  return (
    <Section id="features" className="section-bg noise-overlay py-20 sm:py-28">
      <div className="container mx-auto">
        <div className="mx-auto max-w-2xl text-center mb-14">
          <motion.p variants={fadeUp} className="text-sm font-semibold uppercase tracking-wider text-gold mb-3">Features</motion.p>
          <motion.h2 variants={fadeUp} className="font-grotesk text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            Everything you need to <span className="text-gradient">invest smarter</span>
          </motion.h2>
          <motion.p variants={fadeUp} className="mt-4 text-lg text-muted-foreground">
            Powerful tools designed for the modern investor — secure, fast, and beautifully simple.
          </motion.p>
        </div>

        <motion.div variants={stagger} initial="hidden" className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <motion.div key={f.title} variants={fadeUp} className="feature-card group">
              <div className="feature-icon mb-5">
                <f.icon className="size-6 text-gold" />
              </div>
              <h3 className="text-lg font-semibold tracking-tight">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </Section>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *  4. LIVE MARKET — Beautiful crypto table
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function LiveMarketSection() {
  const coins = [
    { name: "Bitcoin", symbol: "BTC", price: "$67,245.30", change: "+2.4%", up: true, cap: "$1.32T" },
    { name: "Ethereum", symbol: "ETH", price: "$3,521.80", change: "+1.8%", up: true, cap: "$423B" },
    { name: "USDT", symbol: "USDT", price: "$1.00", change: "0.0%", up: true, cap: "$95B" },
    { name: "BNB", symbol: "BNB", price: "$612.40", change: "-0.5%", up: false, cap: "$94B" },
    { name: "Solana", symbol: "SOL", price: "$178.20", change: "+4.2%", up: true, cap: "$79B" },
  ];

  return (
    <Section id="market" className="section-bg py-20 sm:py-28">
      <div className="container mx-auto">
        <div className="mx-auto max-w-2xl text-center mb-14">
          <p className="text-sm font-semibold uppercase tracking-wider text-gold mb-3">Live Market</p>
          <h2 className="font-grotesk text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            Track the <span className="text-gradient-gold">market in real-time</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Stay ahead with live crypto prices, market cap data, and instant insights.
          </p>
        </div>

        <div className="glass-card overflow-x-auto">
          {/* Table header */}
          <div className="grid grid-cols-[2fr_1fr_1fr] gap-4 border-b border-white/[0.06] px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:grid-cols-[2fr_1fr_1fr_1fr_1fr] sm:px-6">
            <span>Asset</span>
            <span className="hidden sm:block">Price</span>
            <span className="text-right sm:text-left">24h</span>
            <span className="hidden sm:block">Market Cap</span>
            <span className="text-right">Trend</span>
          </div>
          {coins.map((c) => (
            <div key={c.symbol} className="grid grid-cols-[2fr_1fr_1fr] gap-4 border-b border-white/[0.04] px-4 py-4 items-center transition-colors hover:bg-white/[0.02] sm:grid-cols-[2fr_1fr_1fr_1fr_1fr] sm:px-6">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue/20 to-blue-dark/20 text-sm font-bold">
                  {c.symbol.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.symbol}</p>
                </div>
              </div>
              <span className="hidden sm:block font-medium tabular-nums">{c.price}</span>
              <span className={cn("text-sm font-semibold", c.up ? "text-success" : "text-destructive")}>{c.change}</span>
              <span className="hidden sm:block text-sm text-muted-foreground">{c.cap}</span>
              <div className="flex justify-end">
                <Activity className={cn("size-4", c.up ? "text-success" : "text-destructive")} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *  5. TRADING DASHBOARD PREVIEW — Large mockup
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function DashboardPreviewSection() {
  return (
    <Section id="dashboard" className="hero-bg noise-overlay py-20 sm:py-28 overflow-hidden">
      <div className="container mx-auto">
        <div className="mx-auto max-w-2xl text-center mb-14">
          <p className="text-sm font-semibold uppercase tracking-wider text-gold mb-3">Dashboard</p>
          <h2 className="font-grotesk text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            A dashboard that <span className="text-gradient">works for you</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Every widget designed for clarity, speed, and actionable insights at a glance.
          </p>
        </div>

        {/* Large mockup */}
        <motion.div
          initial={{ opacity: 1, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="relative mx-auto max-w-5xl"
        >
          {/* Background glow */}
          <div className="absolute -inset-8 rounded-[40px] bg-gradient-to-r from-blue/10 via-blue-dark/5 to-blue/10 blur-3xl" />

          <div className="mockup-card relative p-6 sm:p-8">
            {/* Top bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
              <div className="flex items-center gap-3">
                <Logo className="size-8" />
                <span className="font-bold text-gradient">Zeminex Global</span>
              </div>
              <div className="flex items-center gap-2">
                {["Overview", "Analytics", "Reports"].map((tab, i) => (
                  <button key={tab} className={cn(
                    "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                    i === 0 ? "gradient-blue text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                  )}>
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* KPI Row */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-6">
              {[
                { label: "Portfolio", value: "$127,492", change: "+12.4%", icon: Wallet },
                { label: "Earned", value: "$18,230", change: "+8.2%", icon: TrendingUp },
                { label: "Available", value: "$84,230", change: "", icon: Coins },
                { label: "Team", value: "1,247", change: "+15%", icon: Users },
              ].map((kpi) => (
                <div key={kpi.label} className="glass-card rounded-xl p-3 sm:p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex size-8 items-center justify-center rounded-lg bg-gold/10 text-gold">
                      <kpi.icon className="size-4" />
                    </div>
                    <span className="text-xs text-muted-foreground">{kpi.label}</span>
                  </div>
                  <p className="text-lg font-bold tabular-nums">{kpi.value}</p>
                  {kpi.change && <span className="text-xs font-medium text-success">{kpi.change}</span>}
                </div>
              ))}
            </div>

            {/* Chart area placeholder */}
            <div className="glass-card rounded-xl p-4 mb-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-semibold">Portfolio Growth</span>
                <span className="text-xs text-success font-medium">+24.5% this month</span>
              </div>
              <div className="flex items-end gap-1 h-28">
                {[30, 45, 35, 55, 50, 65, 60, 70, 55, 75, 80, 90, 78, 85, 92, 88, 95].map((h, i) => (
                  <div key={i} className="flex-1 rounded-t gradient-blue opacity-70" style={{ height: `${h}%` }} />
                ))}
              </div>
            </div>

            {/* Bottom row */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Main Wallet", value: "$84,230", sub: "Available" },
                { label: "Bonus Wallet", value: "$28,912", sub: "Earned" },
                { label: "Trading Wallet", value: "$14,350", sub: "Active" },
              ].map((w) => (
                <div key={w.label} className="glass-card rounded-xl p-3 text-center">
                  <p className="text-[10px] font-medium text-muted-foreground">{w.label}</p>
                  <p className="mt-1 text-sm font-bold tabular-nums text-gradient-gold">{w.value}</p>
                  <p className="text-[10px] text-muted-foreground">{w.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </Section>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *  6. WHY CHOOSE US — Feature comparison cards
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function WhyChooseUsSection() {
  const reasons = [
    { icon: ShieldCheck, title: "Military-Grade Security", desc: "256-bit AES encryption, cold storage, and SOC2 compliance keep your assets safe 24/7.", gradient: "from-blue/20 to-blue-dark/20" },
    { icon: Zap, title: "Lightning Fast", desc: "Execute trades and transfers in milliseconds with our globally distributed infrastructure.", gradient: "from-blue/20 to-blue-dark/20" },
    { icon: BarChart3, title: "Advanced Analytics", desc: "Real-time dashboards, portfolio heatmaps, and AI-driven market insights at your fingertips.", gradient: "from-blue/20 to-blue-dark/20" },
    { icon: Eye, title: "Full Transparency", desc: "Every transaction, fee, and earning is visible in real-time — no hidden charges, ever.", gradient: "from-blue/20 to-blue-dark/20" },
    { icon: Globe, title: "Global Reach", desc: "Available in 45+ countries with multi-currency support and localized compliance.", gradient: "from-blue/20 to-blue-dark/20" },
    { icon: Award, title: "Reward System", desc: "Earn through referrals, bonuses, and trading rewards — your network compounds your growth.", gradient: "from-blue/20 to-blue-dark/20" },
  ];

  return (
    <Section id="why" className="section-bg py-20 sm:py-28">
      <div className="container mx-auto">
        <div className="mx-auto max-w-2xl text-center mb-14">
          <p className="text-sm font-semibold uppercase tracking-wider text-gold mb-3">Why Zeminex Global</p>
          <h2 className="font-grotesk text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            Built for <span className="text-gradient">serious investors</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            We obsess over security, speed, and simplicity so you can focus on what matters — growing your wealth.
          </p>
        </div>

        <motion.div variants={stagger} initial="hidden" className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {reasons.map((r) => (
            <motion.div key={r.title} variants={fadeUp} className="landing-card group p-6 sm:p-8">
              <div className={cn("flex size-14 items-center justify-center rounded-2xl mb-5 bg-gradient-to-br", r.gradient)}>
                <r.icon className="size-6 text-gold" />
              </div>
              <h3 className="text-lg font-semibold tracking-tight">{r.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{r.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </Section>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *  7. SECURITY — Premium illustration
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function SecuritySection() {
  const features = [
    { icon: Lock, label: "256-bit Encryption" },
    { icon: ShieldCheck, label: "SOC2 Compliant" },
    { icon: Server, label: "Cold Storage" },
    { icon: Eye, label: "2FA Authentication" },
  ];

  return (
    <Section id="security" className="hero-bg noise-overlay py-20 sm:py-28">
      <div className="container mx-auto">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-20 items-center">
          {/* Left — Visual */}
          <motion.div initial={{ opacity: 1, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="relative flex items-center justify-center">
            <div className="relative size-64 sm:size-80 lg:size-96">
              {/* Outer ring */}
              <div className="animate-rotate-slow absolute inset-0 rounded-full border-2 border-dashed border-blue/20" />
              {/* Inner ring */}
              <div className="animate-rotate-slow absolute inset-8 rounded-full border-2 border-blue/20" style={{ animationDuration: "20s", animationDirection: "reverse" }} />
              {/* Glow center */}
              <div className="shield-gradient absolute inset-16 flex items-center justify-center rounded-full">
                <ShieldCheck className="size-20 text-gold" />
              </div>
              {/* Orbiting dots */}
              <div className="animate-orbit absolute left-1/2 top-0 size-4 -translate-x-1/2 rounded-full bg-blue shadow-glow-blue" style={{ animationDuration: "12s" }} />
              <div className="animate-orbit absolute left-1/2 top-0 size-3 -translate-x-1/2 rounded-full bg-blue shadow-glow-blue" style={{ animationDuration: "18s", animationDelay: "-6s" }} />
            </div>
          </motion.div>

          {/* Right — Copy */}
          <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <motion.p variants={fadeUp} className="text-sm font-semibold uppercase tracking-wider text-gold mb-3">Security First</motion.p>
            <motion.h2 variants={fadeUp} className="font-grotesk text-3xl font-bold tracking-tight sm:text-4xl">
              Your assets are protected by <span className="text-gradient-gold">military-grade security</span>
            </motion.h2>
            <motion.p variants={fadeUp} className="mt-4 text-lg text-muted-foreground leading-relaxed">
              We use the same encryption technology used by major banks and financial institutions. Your funds are stored in cold wallets with multi-signature protection.
            </motion.p>

            <motion.div variants={stagger} className="mt-8 grid grid-cols-2 gap-4">
              {features.map((f) => (
                <motion.div key={f.label} variants={fadeUp} className="landing-card flex items-center gap-3 p-4">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-gold/10 text-gold">
                    <f.icon className="size-5" />
                  </div>
                  <span className="text-sm font-medium">{f.label}</span>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </div>
    </Section>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *  8. TESTIMONIALS — Modern glass cards
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function TestimonialsSection() {
  const testimonials = [
    { name: "Alex M.", role: "Crypto Trader", text: "Zeminex Global has transformed the way I manage my portfolio. The analytics are unmatched, and the security gives me total peace of mind.", stars: 5 },
    { name: "Sarah K.", role: "Investment Analyst", text: "The interface is beautiful and intuitive. I've recommended Zeminex Global to my entire network — the referral rewards are just a bonus.", stars: 5 },
    { name: "David L.", role: "Entrepreneur", text: "Finally, a platform that combines premium design with serious financial tools. Zeminex Global feels like it was built for professionals.", stars: 5 },
  ];

  return (
    <Section id="testimonials" className="section-bg py-20 sm:py-28">
      <div className="container mx-auto">
        <div className="mx-auto max-w-2xl text-center mb-14">
          <p className="text-sm font-semibold uppercase tracking-wider text-gold mb-3">Testimonials</p>
          <h2 className="font-grotesk text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            Loved by <span className="text-gradient">investors worldwide</span>
          </h2>
        </div>

        <motion.div variants={stagger} initial="hidden" className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((t) => (
            <motion.div key={t.name} variants={fadeUp} className="testimonial-card">
              <div className="mb-4 flex gap-1">
                {Array.from({ length: t.stars }).map((_, i) => (
                  <Star key={i} className="size-4 fill-gold text-gold" />
                ))}
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">"{t.text}"</p>
              <div className="mt-6 flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-full gradient-blue text-primary-foreground font-bold text-sm">
                  {t.name.charAt(0)}
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </Section>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *  9. FAQ — Glass accordion
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function FaqSection() {
  const faqs = [
    { q: "What is Zeminex Global?", a: "Zeminex Global is a premium investment platform that combines institutional-grade analytics with an intuitive interface, allowing you to grow your wealth with confidence and clarity." },
    { q: "How secure is my investment?", a: "We use 256-bit AES encryption, cold storage for all funds, SOC2 compliance, and multi-factor authentication. Your assets are protected at the same level as major financial institutions." },
    { q: "What wallets are available?", a: "Zeminex Global provides three separate wallets — Main, Bonus, and Trading — each with full transparency, instant transfers, and real-time balance tracking." },
    { q: "How does the referral program work?", a: "Share your unique referral link and earn commissions on every member of your network. Our multi-tier system rewards you for direct and indirect referrals." },
    { q: "Can I withdraw anytime?", a: "Yes! Available balances can be withdrawn at any time. Requests are processed quickly, and you'll receive confirmation every step of the way." },
    { q: "What payment methods are supported?", a: "We support USDT (BEP-20) and other major cryptocurrencies through our secure payment partner, NOWPayments." },
  ];

  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <Section id="faq" className="section-bg py-20 sm:py-28">
      <div className="container mx-auto">
        <div className="mx-auto max-w-2xl text-center mb-14">
          <p className="text-sm font-semibold uppercase tracking-wider text-gold mb-3">FAQ</p>
          <h2 className="font-grotesk text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            Frequently asked <span className="text-gradient-gold">questions</span>
          </h2>
        </div>

        <div className="mx-auto max-w-3xl space-y-3">
          {faqs.map((faq, i) => (
            <div key={i} className="glass-accordion">
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="flex w-full items-center justify-between gap-4 p-5 text-left"
              >
                <span className="flex items-center gap-3 font-semibold">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-gold/10 text-gold text-xs font-bold">{i + 1}</span>
                  {faq.q}
                </span>
                <ChevronDown className={cn("size-5 shrink-0 text-muted-foreground transition-transform duration-300", openIndex === i && "rotate-180")} />
              </button>
              <AnimatePresence>
                {openIndex === i && (
                  <motion.div initial={{ height: 0, opacity: 1 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 1 }} transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}>
                    <p className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *  10. CTA — Large banner
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function CtaSection() {
  return (
    <Section className="py-20 sm:py-28">
      <div className="container mx-auto">
        <div className="cta-bg relative overflow-hidden rounded-[24px] border border-blue/10 p-8 sm:p-14 lg:p-20">
          {/* Background orbs */}
          <div className="glow-orb left-[-10%] top-[-20%] size-[400px] bg-blue/10" />
          <div className="glow-orb right-[-10%] bottom-[-20%] size-[300px] bg-blue/10" />

          <div className="relative z-10 mx-auto max-w-2xl text-center">
            <motion.div initial={{ opacity: 1, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
              <h2 className="font-grotesk text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
                Ready to grow your <span className="text-gradient">wealth</span>?
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Join thousands of investors who trust Zeminex Global for their financial journey. Start today — no hidden fees, no lock-in.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-4">
                <Link to="/register" className="btn-premium h-12 px-8 text-base">
                  Create Free Account <ArrowRight className="size-4" />
                </Link>
                <Link to="/login" className="btn-secondary-premium h-12 px-8 text-base">
                  Sign In
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </Section>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *  LANDING PAGE — Assembles all sections
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export function LandingPage() {
  return (
    <main className="overflow-hidden">
      <HeroSection />
      <PartnersSection />
      <FeaturesSection />
      <LiveMarketSection />
      <DashboardPreviewSection />
      <WhyChooseUsSection />
      <SecuritySection />
      <TestimonialsSection />
      <FaqSection />
      <CtaSection />
    </main>
  );
}