import { useLocation, Link } from "react-router-dom";
import { Search, Wallet, ArrowDownToLine, Menu } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useDashboardSummary } from "@/hooks/useDashboardSummary";
import { formatCurrency } from "@/lib/utils";
import { UserMenu } from "./UserMenu";

const TITLES: Record<string, string> = {
  "/app": "Dashboard",
  "/app/wallet": "Wallet",
  "/app/p2p": "P2P",
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

interface TopbarProps {
  onToggleMobileSidebar?: () => void;
}

/**
 * Premium crypto-exchange topbar — floating glass with search,
 * wallet balance, theme toggle, user menu, and a gold "Quick Deposit" CTA.
 *
 * On mobile, admin users see a hamburger menu button instead of just
 * the page title, which opens the sidebar drawer.
 */
export function Topbar({ onToggleMobileSidebar }: TopbarProps) {
  const { user } = useAuth();
  const title = usePageTitle();
  const { data } = useDashboardSummary();
  const isAdmin = user?.role === "admin";

  return (
    <header className="topbar-glass sticky top-0 z-30 flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
      {/* Gradient accent line */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue/40 to-transparent opacity-80" />

      {/* ── Left: Hamburger (admin mobile) or Title ─────────── */}
      <div className="flex min-w-0 items-center gap-3">
        {isAdmin && onToggleMobileSidebar && (
          <button
            type="button"
            onClick={onToggleMobileSidebar}
            className="flex size-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-blue/[0.08] hover:text-foreground lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="size-5" />
          </button>
        )}
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
        {/* Wallet balance — desktop, user only */}
        {!isAdmin && data && (
          <Link to="/app/wallet" className="wallet-pill hidden sm:flex">
            <Wallet className="size-3.5 text-gold" />
            <span className="text-gradient-gold">{formatCurrency(data.wallets.totalAvailable)}</span>
          </Link>
        )}

        {/* Notifications */}
        {/* <NotificationsMenu /> */}

        {/* User menu */}
        <UserMenu />

        {/* Quick Deposit CTA — desktop, user only */}
        {!isAdmin && (
          <Link to="/app/packages" className="deposit-cta hidden lg:flex">
            <ArrowDownToLine className="size-4" />
            Deposit
          </Link>
        )}
      </div>
    </header>
  );
}