import { NavLink } from "react-router-dom";
import { LayoutDashboard, Wallet, ArrowDownToLine, Package, Users, Gift, FileText, Settings, ShieldCheck, BarChart3, SlidersHorizontal, Mail, CreditCard, ShieldAlert, ScrollText } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

interface NavItem {
  label: string;
  to: string;
  icon: typeof LayoutDashboard;
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

interface SidebarProps {
  onNavigate?: () => void;
}

export function Sidebar({ onNavigate }: SidebarProps) {
  const { user } = useAuth();
  const items = NAV.filter((i) => !i.adminOnly || user?.role === "admin");

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-5">
        <div className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold">
          Z
        </div>
        <span className="text-lg font-bold tracking-tight">Zaminex</span>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/app"}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                "flex min-h-[44px] items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground",
              )
            }
          >
            <item.icon className="size-5 shrink-0" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <p className="px-3 text-xs text-sidebar-foreground/50">Zaminex · v1.0</p>
      </div>
    </div>
  );
}