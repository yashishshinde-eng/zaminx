import { NavLink, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Wallet,
  ArrowDownToLine,
  Package,
  Users,
  Gift,
  FileText,
  Settings,
  X,
  Sparkles,
  ArrowRightLeft,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useDashboardSummary } from "@/hooks/useDashboardSummary";
import { formatCurrency } from "@/lib/utils";
import { useState } from "react";

/* ── Navigation items for the full menu ─────────────────────── */
interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
}

const MENU_ITEMS: NavItem[] = [
  { label: "Dashboard", to: "/app", icon: LayoutDashboard },
  { label: "Wallet", to: "/app/wallet", icon: Wallet },
  { label: "P2P", to: "/app/p2p", icon: ArrowRightLeft },
  { label: "Withdrawals", to: "/app/withdrawals", icon: ArrowDownToLine },
  { label: "Packages", to: "/app/packages", icon: Package },
  { label: "Team", to: "/app/team", icon: Users },
  { label: "Bonanza", to: "/app/bonanzas", icon: Gift },
  { label: "Reports", to: "/app/reports", icon: FileText },
  { label: "Settings", to: "/app/settings", icon: Settings },
];

/* ── Quick nav items shown in the bottom bar ──────────────── */
interface BottomNavItem {
  label: string;
  to: string;
  icon: LucideIcon;
}

const BOTTOM_NAV: BottomNavItem[] = [
  { label: "Home", to: "/app", icon: LayoutDashboard },
  { label: "Wallet", to: "/app/wallet", icon: Wallet },
  { label: "Trade", to: "/app/packages", icon: Package },
  { label: "Team", to: "/app/team", icon: Users },
  { label: "Reports", to: "/app/reports", icon: FileText },
];

/* ── Grouped sections for the full menu ───────────────────── */
const MENU_GROUPS = [
  { label: "Overview", items: MENU_ITEMS.filter((i) => i.label === "Dashboard" || i.label === "Reports") },
  { label: "Earnings", items: MENU_ITEMS.filter((i) => ["Wallet", "P2P", "Withdrawals", "Packages"].includes(i.label)) },
  { label: "Network", items: MENU_ITEMS.filter((i) => ["Team", "Bonanza"].includes(i.label)) },
  { label: "Account", items: MENU_ITEMS.filter((i) => i.label === "Settings") },
];

/**
 * Premium floating bottom navigation bar for mobile.
 * Shows 5 main tabs + a "Menu" button that opens a bottom sheet
 * with all navigation items grouped by section.
 * Only rendered below the `lg` breakpoint.
 */
export function MobileBottomNav() {
  const location = useLocation();
  const { user } = useAuth();
  const { data } = useDashboardSummary();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      {/* ── Bottom sheet overlay + menu ──────────────────────── */}
      <AnimatePresence>
        {menuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md lg:hidden"
              onClick={() => setMenuOpen(false)}
            />
            {/* Bottom sheet */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "tween", duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="fixed inset-x-0 bottom-0 z-50 max-h-[80vh] overflow-y-auto rounded-t-[24px] border-t border-white/[0.08] bg-[hsl(var(--card))] px-4 pb-8 pt-3 shadow-xl lg:hidden"
            >
              {/* Handle bar */}
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/[0.15]" />

              {/* Header with close button */}
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="gradient-blue flex size-9 items-center justify-center rounded-xl text-primary-foreground font-bold shadow-glow-blue">
                    Z
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{user?.name ?? "—"}</p>
                    <p className="text-[11px] text-muted-foreground capitalize">{user?.role ?? "user"}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  className="flex size-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground"
                  aria-label="Close menu"
                >
                  <X className="size-5" />
                </button>
              </div>

              {/* Wallet balance pill */}
              {data && (
                <div className="mb-4 flex items-center gap-2 rounded-[14px] border border-white/[0.08] bg-white/[0.03] px-3 py-2.5">
                  <Sparkles className="size-3.5 text-gold" />
                  <span className="text-xs font-semibold text-muted-foreground">Available</span>
                  <span className="ml-auto text-sm font-bold tabular-nums text-gradient-gold">
                    {formatCurrency(data.wallets.totalAvailable)}
                  </span>
                </div>
              )}

              {/* Nav sections */}
              <nav className="space-y-4">
                {MENU_GROUPS.map((group) => (
                  <div key={group.label}>
                    <p className="mb-1.5 px-1 text-[10px] font-bold uppercase tracking-[0.15em] text-sidebar-foreground/30">
                      {group.label}
                    </p>
                    <div className="space-y-0.5">
                      {group.items.map((item) => {
                        const isActive =
                          item.to === "/app"
                            ? location.pathname === "/app"
                            : location.pathname.startsWith(item.to);
                        return (
                          <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.to === "/app"}
                            onClick={() => setMenuOpen(false)}
                            className={cn(
                              "sidebar-nav-item",
                              isActive
                                ? "active"
                                : "text-sidebar-foreground/50 hover:bg-blue/[0.08] hover:text-gold-light",
                            )}
                          >
                            {isActive && (
                              <motion.span
                                layoutId="mobile-menu-active"
                                className="gradient-blue absolute inset-0 rounded-[12px] shadow-glow-blue"
                                transition={{ type: "spring", stiffness: 400, damping: 32 }}
                              />
                            )}
                            <span
                              className={cn(
                                "relative z-10 flex size-7 items-center justify-center rounded-lg transition-colors duration-200",
                                isActive ? "text-primary-foreground" : "text-sidebar-foreground/50",
                              )}
                            >
                              <item.icon className="size-[17px]" />
                            </span>
                            <span className="relative z-10">{item.label}</span>
                          </NavLink>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Bottom navigation bar ──────────────────────────────── */}
      <nav className="fixed inset-x-0 bottom-0 z-40 lg:hidden" aria-label="Mobile navigation">
        {/* Fade gradient above the nav */}
        <div className="pointer-events-none absolute inset-x-0 -top-8 h-8 bg-gradient-to-t from-background via-background/60 to-transparent" />

        <div className="mx-3 mb-3">
          <div className="bottom-nav-glass relative flex items-center justify-around overflow-hidden rounded-[24px] px-1 pt-2 pb-2">
            {BOTTOM_NAV.map((item) => {
              const isActive =
                item.to === "/app"
                  ? location.pathname === "/app"
                  : location.pathname.startsWith(item.to);

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/app"}
                  className="relative flex min-w-0 flex-col items-center gap-0.5 px-2 py-1"
                >
                  {/* Animated background pill */}
                  {isActive && (
                    <motion.span
                      layoutId="mobile-nav-active"
                      className="absolute inset-0 rounded-[14px] gradient-blue"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      style={{ boxShadow: "0 0 16px -2px hsl(var(--blue) / 0.45)" }}
                    />
                  )}

                  {/* Icon container */}
                  <span
                    className={cn(
                      "relative z-10 flex size-7 items-center justify-center rounded-xl transition-transform duration-200 active:scale-[0.88]",
                      isActive && "text-primary-foreground",
                    )}
                  >
                    <item.icon className="size-[18px]" />
                  </span>

                  {/* Label */}
                  <span
                    className={cn(
                      "relative z-10 truncate text-[10px] font-semibold leading-none transition-colors duration-200",
                      isActive ? "text-primary-foreground" : "text-muted-foreground",
                    )}
                  >
                    {item.label}
                  </span>
                </NavLink>
              );
            })}

            {/* Menu button opens bottom sheet */}
            {/* <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="relative flex min-w-0 flex-col items-center gap-0.5 px-2 py-1 transition-transform duration-200 active:scale-[0.88]"
            >
              <span className="flex size-7 items-center justify-center rounded-xl text-muted-foreground transition-colors duration-200 hover:bg-blue/[0.08] hover:text-gold-light">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 4.5H15M3 9H15M3 13.5H15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <circle cx="15" cy="4.5" r="2" fill="currentColor" opacity="0.5" />
                </svg>
              </span>
              <span className="truncate text-[10px] font-semibold leading-none text-muted-foreground transition-colors duration-200 hover:text-gold-light">
                Menu
              </span>
            </button> */}
          </div>
        </div>

        {/* Safe area spacer */}
        <div className="h-[env(safe-area-inset-bottom,0px)]" />
      </nav>
    </>
  );
}