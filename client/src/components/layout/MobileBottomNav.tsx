import { NavLink, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Wallet,
  Package,
  Users,
  FileText,
  Menu,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface BottomNavItem {
  label: string;
  to: string;
  icon: LucideIcon;
}

const BOTTOM_NAV: BottomNavItem[] = [
  { label: "Home", to: "/app", icon: LayoutDashboard },
  { label: "Wallet", to: "/app/wallet", icon: Wallet },
  { label: "Packages", to: "/app/packages", icon: Package },
  { label: "Team", to: "/app/team", icon: Users },
  { label: "Reports", to: "/app/reports", icon: FileText },
];

interface MobileBottomNavProps {
  onOpenMenu: () => void;
}

/**
 * Premium floating bottom navigation bar for mobile.
 * Glossy glass pill with animated gold active indicator, shimmer effect,
 * and a "More" button for the sidebar drawer.
 * Only rendered below the `lg` breakpoint.
 */
export function MobileBottomNav({ onOpenMenu }: MobileBottomNavProps) {
  const location = useLocation();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 lg:hidden" aria-label="Mobile navigation">
      {/* Fade gradient above the nav so content blends smoothly */}
      <div className="pointer-events-none absolute inset-x-0 -top-8 h-8 bg-gradient-to-t from-background via-background/60 to-transparent" />

      <div className="mx-3 mb-3">
        <div
          className="card-shimmer relative flex items-center justify-around overflow-hidden rounded-[24px] border border-white/[0.08] px-1 pt-2 pb-2 backdrop-blur-2xl"
          style={{
            background: "linear-gradient(135deg, hsl(var(--card) / 0.97), hsl(var(--card) / 0.82)), linear-gradient(135deg, rgba(246, 180, 0, 0.04), rgba(13, 110, 253, 0.02))",
            boxShadow: "var(--shadow-card), 0 -2px 24px -4px rgba(246, 180, 0, 0.10), inset 0 1px 0 0 rgba(255, 255, 255, 0.08), inset 0 -1px 0 0 rgba(255, 255, 255, 0.02)",
          }}
        >
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
                {/* Animated gold background pill — slides between tabs */}
                {isActive && (
                  <motion.span
                    layoutId="mobile-nav-active"
                    className="absolute inset-0 rounded-[14px] brand-gradient"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    style={{ boxShadow: "0 0 16px -2px hsl(var(--gold) / 0.45)" }}
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

          {/* More button opens sidebar drawer */}
          <button
            type="button"
            onClick={onOpenMenu}
            className="relative flex min-w-0 flex-col items-center gap-0.5 px-2 py-1 active:scale-[0.88] transition-transform duration-200"
          >
            <span className="flex size-7 items-center justify-center rounded-xl text-muted-foreground hover:text-foreground transition-colors duration-200 hover:bg-white/[0.04]">
              <Menu className="size-[18px]" />
            </span>
            <span className="truncate text-[10px] font-semibold leading-none text-muted-foreground hover:text-foreground transition-colors duration-200">
              More
            </span>
          </button>
        </div>
      </div>

      {/* Safe area spacer for phones with home indicator */}
      <div className="h-[env(safe-area-inset-bottom,0px)]" />
    </nav>
  );
}