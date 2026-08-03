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
}

const NAV: NavItem[] = [
  { label: "Dashboard", to: "/app", icon: LayoutDashboard },
  { label: "Wallet", to: "/app/wallet", icon: Wallet },
  { label: "Withdrawals", to: "/app/withdrawals", icon: ArrowDownToLine },
  { label: "Packages", to: "/app/packages", icon: Package },
  { label: "Team", to: "/app/team", icon: Users },
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

const GROUP_ORDER = ["Overview", "Earnings", "Network", "Account", "Admin"] as const;
const GROUP_BY_LABEL: Record<string, (item: NavItem) => boolean> = {
  Overview: (i) => i.label === "Dashboard" || i.label === "Reports",
  Earnings: (i) => ["Wallet", "Withdrawals", "Packages"].includes(i.label),
  Network: (i) => ["Team", "Bonanza"].includes(i.label),
  Account: (i) => i.label === "Settings",
  Admin: (i) => i.adminOnly === true,
};

interface SidebarProps {
  onNavigate?: () => void;
  /** When rendered in the mobile drawer, force expanded + hide the collapse toggle. */
  mobile?: boolean;
}

export function Sidebar({ onNavigate, mobile = false }: SidebarProps) {
  const { user } = useAuth();
  const { collapsed, toggle } = useSidebarState();
  const isCollapsed = mobile ? false : collapsed;

  const items = NAV.filter((i) => !i.adminOnly || user?.role === "admin");
  const groups: NavGroup[] = GROUP_ORDER.map((label) => ({
    label,
    items: items.filter(GROUP_BY_LABEL[label]),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="flex h-full flex-col glass text-sidebar-foreground">
      {/* Brand header */}
      <div className={cn("flex h-16 items-center gap-2.5 border-b border-sidebar-border", isCollapsed ? "justify-center px-3" : "px-5")}>
        <div className="brand-gradient flex size-9 shrink-0 items-center justify-center rounded-lg text-primary-foreground font-bold shadow-sm">
          Z
        </div>
        {!isCollapsed && <span className="text-lg font-bold tracking-tight text-gradient">Zaminex</span>}
      </div>

      {/* Nav */}
      <nav className="scrollbar-thin flex-1 space-y-4 overflow-y-auto p-3">
        {groups.map((group) => (
          <div key={group.label} className="space-y-1">
            {!isCollapsed && (
              <p className="px-3 pb-0.5 pt-1 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
                {group.label}
              </p>
            )}
            {isCollapsed && group.label !== "Overview" && (
              <div className="mx-auto my-1 h-px w-8 bg-sidebar-border/70" />
            )}
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/app"}
                onClick={onNavigate}
                title={isCollapsed ? item.label : undefined}
                className={({ isActive }) =>
                  cn(
                    "relative flex min-h-[44px] items-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    isCollapsed ? "justify-center px-2" : "gap-3 px-3",
                    isActive
                      ? "text-primary-foreground"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <motion.span
                        layoutId="sidebar-active"
                        className="brand-gradient absolute inset-0 rounded-md shadow-sm"
                        transition={{ type: "spring", stiffness: 400, damping: 32 }}
                      />
                    )}
                    <item.icon className="relative z-10 size-5 shrink-0" />
                    {!isCollapsed && <span className="relative z-10">{item.label}</span>}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* User mini-profile footer + collapse toggle */}
      <div className="border-t border-sidebar-border p-3">
        <div className={cn("flex items-center", isCollapsed ? "justify-center" : "gap-2.5")}>
          <Avatar
            src={null}
            alt={user?.name ?? "User"}
            fallback={user?.name ?? "U"}
            size={isCollapsed ? "sm" : "md"}
          />
          {!isCollapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{user?.name ?? "—"}</p>
              <p className="truncate text-xs text-sidebar-foreground/50 capitalize">{user?.role ?? "user"}</p>
            </div>
          )}
          {!mobile && (
            <button
              type="button"
              onClick={toggle}
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="flex size-7 shrink-0 items-center justify-center rounded-md text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
            >
              <ChevronLeft className={cn("size-4 transition-transform", isCollapsed && "rotate-180")} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}