import { useLocation, Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Moon, Sun, Search, Wallet, MessageSquare, ArrowDownToLine } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { useDashboardSummary } from "@/hooks/useDashboardSummary";
import { formatCurrency } from "@/lib/utils";
import { NotificationsMenu } from "./NotificationsMenu";
import { UserMenu } from "./UserMenu";

const TITLES: Record<string, string> = {
  "/app": "Dashboard",
  "/app/wallet": "Wallet",
  "/app/withdrawals": "Withdrawals",
  "/app/packages": "Packages",
  "/app/team": "Team",
  "/app/bonanzas": "Bonanza",
  "/app/reports": "Reports",
  "/app/settings": "Settings",
  "/app/admin": "Admin",
  "/app/admin/users": "Users",
  "/app/admin/compensation": "Compensation",
  "/app/admin/bonanzas": "Bonanzas",
  "/app/admin/cms": "CMS Pages",
  "/app/admin/site-config": "Site Config",
  "/app/admin/smtp": "SMTP",
  "/app/admin/payments": "NOWPayments",
  "/app/admin/security": "Security",
  "/app/admin/logs": "Logs",
  "/app/admin/reports": "Admin Reports",
};

function usePageTitle(): string {
  const { pathname } = useLocation();
  if (TITLES[pathname]) return TITLES[pathname];
  if (pathname.startsWith("/app/admin/users/")) return "User detail";
  return "Dashboard";
}

/**
 * Premium crypto-exchange topbar — floating glass with search,
 * wallet balance, messages, notifications, theme toggle, user menu,
 * and a gold "Quick Deposit" CTA.
 *
 * No hamburger menu on mobile — the bottom nav handles mobile navigation.
 */
export function Topbar() {
  const { theme, toggleTheme } = useTheme();
  const title = usePageTitle();
  const { data } = useDashboardSummary();

  return (
    <header className="topbar-glass sticky top-0 z-30 flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
      {/* Gradient accent line */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue/40 to-transparent opacity-80" />

      {/* ── Left: Title ─────────────────────────────────────── */}
      <div className="flex min-w-0 items-center gap-3">
        <h1 className="truncate font-grotesk text-base font-semibold sm:text-lg">{title}</h1>
      </div>

      {/* ── Center: Search (desktop) ──────────────────────── */}
      <div className="hidden flex-1 items-center justify-center px-8 md:flex">
        <div className="search-input w-full max-w-md">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search transactions, pages, settings…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
          />
          <kbd className="hidden lg:inline-flex items-center rounded-md border border-white/[0.08] bg-white/[0.03] px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* ── Right: Actions ───────────────────────────────── */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Wallet balance — desktop */}
        {data && (
          <Link to="/app/wallet" className="wallet-pill hidden sm:flex">
            <Wallet className="size-3.5 text-gold" />
            <span className="text-gradient-gold">{formatCurrency(data.wallets.totalAvailable)}</span>
          </Link>
        )}

        {/* Messages — desktop */}
        <button
          type="button"
          className="relative hidden size-9 items-center justify-center rounded-xl text-muted-foreground transition-all duration-200 hover:bg-blue/[0.08] hover:text-gold-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 sm:flex"
          aria-label="Messages"
        >
          <MessageSquare className="size-[18px]" />
          <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-blue badge-pulse" />
        </button>

        {/* Theme toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="relative flex size-9 items-center justify-center rounded-xl text-muted-foreground transition-all duration-200 hover:bg-white/[0.06] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={theme}
              initial={{ opacity: 0, rotate: -90, scale: 0.6 }}
              animate={{ opacity: 1, rotate: 0, scale: 1 }}
              exit={{ opacity: 0, rotate: 90, scale: 0.6 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="absolute"
            >
              {theme === "dark" ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
            </motion.span>
          </AnimatePresence>
        </button>

        {/* Notifications */}
        <NotificationsMenu />

        {/* User menu */}
        <UserMenu />

        {/* Quick Deposit CTA — desktop */}
        <Link to="/app/packages" className="deposit-cta hidden lg:flex">
          <ArrowDownToLine className="size-4" />
          Deposit
        </Link>
      </div>
    </header>
  );
}