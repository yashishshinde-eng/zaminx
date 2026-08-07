import { NavLink } from "react-router-dom";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Wallet,
  ArrowDownToLine,
  Package,
  Users,
  Gift,
  FileText,
  Settings,
  ShieldCheck,
  BarChart3,
  SlidersHorizontal,
  Mail,
  CreditCard,
  ShieldAlert,
  ScrollText,
  ChevronLeft,
  Sparkles,
  Crown,
  ArrowRightLeft,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useSidebarState } from "@/hooks/useSidebarState";
import { Avatar } from "@/components/ui/avatar";

interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  adminOnly?: boolean;
  accent?: "gold" | "blue" | "purple" | "success";
}

const NAV: NavItem[] = [
  { label: "Dashboard", to: "/app", icon: LayoutDashboard, accent: "gold" },
  { label: "Wallet", to: "/app/wallet", icon: Wallet, accent: "blue" },
  { label: "P2P", to: "/app/p2p", icon: ArrowRightLeft, accent: "success" },
  { label: "Withdrawals", to: "/app/withdrawals", icon: ArrowDownToLine },
  { label: "Packages", to: "/app/packages", icon: Package, accent: "gold" },
  { label: "Team", to: "/app/team", icon: Users, accent: "purple" },
  { label: "Bonanza", to: "/app/bonanzas", icon: Gift },
  { label: "Reports", to: "/app/reports", icon: FileText },
  { label: "Settings", to: "/app/settings", icon: Settings },
  { label: "Admin", to: "/app/admin", icon: ShieldCheck, adminOnly: true },
  { label: "Users", to: "/app/admin/users", icon: Users, adminOnly: true },
  { label: "Compensation", to: "/app/admin/compensation", icon: SlidersHorizontal, adminOnly: true },
  { label: "Bonanzas", to: "/app/admin/bonanzas", icon: Gift, adminOnly: true },
  { label: "CMS Pages", to: "/app/admin/cms", icon: FileText, adminOnly: true },
  { label: "Site Config", to: "/app/admin/site-config", icon: Settings, adminOnly: true },
  { label: "SMTP", to: "/app/admin/smtp", icon: Mail, adminOnly: true },
  { label: "NOWPayments", to: "/app/admin/payments", icon: CreditCard, adminOnly: true },
  { label: "Security", to: "/app/admin/security", icon: ShieldAlert, adminOnly: true },
  { label: "Logs", to: "/app/admin/logs", icon: ScrollText, adminOnly: true },
  { label: "Admin Reports", to: "/app/admin/reports", icon: BarChart3, adminOnly: true },
];

interface NavGroup {
  label: string;
  items: NavItem[];
}

/* ── Grouping rules for each role ─────────────────────────────────── */

const USER_GROUPS: NavGroup[] = [
  { label: "Overview", items: NAV.filter((i) => i.label === "Dashboard" || i.label === "Reports") },
  { label: "Earnings", items: NAV.filter((i) => ["Wallet", "P2P", "Withdrawals", "Packages"].includes(i.label)) },
  { label: "Network", items: NAV.filter((i) => ["Team", "Bonanza"].includes(i.label)) },
  { label: "Account", items: NAV.filter((i) => i.label === "Settings") },
];

const ADMIN_GROUPS: NavGroup[] = [
  { label: "Dashboard", items: NAV.filter((i) => i.label === "Admin") },
  { label: "Management", items: NAV.filter((i) => ["Users", "Compensation", "Bonanzas", "CMS Pages"].includes(i.label)) },
  { label: "Configuration", items: NAV.filter((i) => ["Site Config", "SMTP", "NOWPayments", "Security"].includes(i.label)) },
  { label: "System", items: NAV.filter((i) => ["Logs", "Admin Reports"].includes(i.label)) },
];

interface SidebarProps {
  onNavigate?: () => void;
  mobile?: boolean;
}

/**
 * Premium floating glass sidebar with cinematic depth.
 * Brand accent line, animated active indicator, section labels,
 * quick-deposit banner, user profile card.
 *
 * When the user is an admin, only admin items are shown.
 * When the user is a regular user, only user items are shown.
 */
export function Sidebar({ onNavigate, mobile = false }: SidebarProps) {
  const { user } = useAuth();
  const { collapsed, toggle } = useSidebarState();
  const isCollapsed = mobile ? false : collapsed;

  const isAdmin = user?.role === "admin";
  const items = NAV.filter((i) => (isAdmin ? i.adminOnly : !i.adminOnly));
  const groups = isAdmin
    ? ADMIN_GROUPS
    : USER_GROUPS;

  return (
    <div className={cn("flex h-full flex-col sidebar-glass", !mobile && "sidebar-float")}>
      {/* ── Brand header ──────────────────────────────────────── */}
      <div className={cn("relative flex h-16 items-center gap-2.5 border-b border-white/[0.04]", isCollapsed ? "justify-center px-3" : "px-5")}>
        {/* Gold accent line on left */}
        <div className="absolute left-0 top-0 bottom-0 w-0.5 gradient-blue" />

        {/* Logo mark */}
        <div className="gradient-blue flex size-9 shrink-0 items-center justify-center rounded-xl text-primary-foreground font-bold shadow-glow-blue">
          Z
        </div>
        {!isCollapsed && (
          <span className="font-grotesk text-lg font-bold tracking-tight text-gradient-gold">Zeminex Global</span>
        )}
      </div>

      {/* ── Quick deposit banner (expanded only, user only) ─── */}
      {!isAdmin && !isCollapsed && (
        <div className="mx-3 mt-3">
          <div className="rounded-[14px] border border-blue/20 bg-gradient-to-br from-blue/10 via-blue-dark/5 to-purple/5 p-3 shadow-[0_0_24px_-8px_hsl(var(--blue)/0.12)]">
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-gold/20 to-gold-dark/10 text-gold shadow-[0_0_12px_-3px_hsl(var(--gold)/0.2)]">
                <Sparkles className="size-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-foreground">Start Earning</p>
                <p className="truncate text-[10px] text-muted-foreground">Activate a package</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Navigation ──────────────────────────────────────── */}
      <nav className="scrollbar-thin flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {groups.map((group, gi) => {
          const visibleItems = group.items.filter((i) => items.some((v) => v.to === i.to));
          if (visibleItems.length === 0) return null;
          return (
            <div key={group.label} className="space-y-0.5">
              {!isCollapsed && (
                <p className="sidebar-section-label" style={gi > 0 ? { paddingTop: undefined } : undefined}>
                  {group.label}
                </p>
              )}
              {isCollapsed && group.label !== "Overview" && group.label !== "Dashboard" && (
                <div className="mx-auto my-2 h-px w-6 bg-white/[0.06]" />
              )}
              {visibleItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/app" || item.to === "/app/admin"}
                  onClick={onNavigate}
                  title={isCollapsed ? item.label : undefined}
                  className={({ isActive }) =>
                    cn(
                      "sidebar-nav-item",
                      isCollapsed ? "justify-center px-2" : "",
                      isActive
                        ? "active"
                        : "text-sidebar-foreground/50 hover:bg-blue/[0.08] hover:text-gold-light",
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <motion.span
                          layoutId="sidebar-active"
                          className="gradient-blue absolute inset-0 rounded-[12px] shadow-glow-blue"
                          transition={{ type: "spring", stiffness: 400, damping: 32 }}
                        />
                      )}
                      <span className={cn(
                        "relative z-10 flex size-7 items-center justify-center rounded-lg transition-colors duration-200",
                        isActive ? "text-primary-foreground" : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground/80",
                      )}>
                        <item.icon className="size-[17px]" />
                      </span>
                      {!isCollapsed && <span className="relative z-10">{item.label}</span>}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          );
        })}
      </nav>

      {/* ── User profile card ─────────────────────────────────── */}
      <div className="border-t border-white/[0.04] p-3">
        <div className={cn("flex items-center gap-2.5 rounded-[14px] bg-white/[0.03] p-2.5 transition-colors hover:bg-blue/[0.06]", isCollapsed ? "justify-center" : "")}>
          <Avatar
            src={null}
            alt={user?.name ?? "User"}
            fallback={user?.name ?? "U"}
            size={isCollapsed ? "sm" : "md"}
          />
          {!isCollapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{user?.name ?? "—"}</p>
              <div className="flex items-center gap-1">
                <Crown className="size-3 text-gold" />
                <p className="truncate text-[11px] text-sidebar-foreground/50 capitalize">{user?.role ?? "user"}</p>
              </div>
            </div>
          )}
          {!mobile && (
            <button
              type="button"
              onClick={toggle}
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="flex size-7 shrink-0 items-center justify-center rounded-lg text-sidebar-foreground/40 transition-all duration-200 hover:bg-blue/[0.08] hover:text-gold-light"
            >
              <ChevronLeft className={cn("size-4 transition-transform duration-300", isCollapsed && "rotate-180")} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}