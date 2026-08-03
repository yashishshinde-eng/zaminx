import { useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/context/ThemeContext";
import { NotificationsMenu } from "./NotificationsMenu";
import { UserMenu } from "./UserMenu";

/** Exact-path → page title. Falls back to a derived label for dynamic routes. */
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

interface TopbarProps {
  onOpenSidebar: () => void;
}

export function Topbar({ onOpenSidebar }: TopbarProps) {
  const { theme, toggleTheme } = useTheme();
  const title = usePageTitle();

  return (
    <header className="glass sticky top-0 z-30 flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-2">
        {/* Mobile menu trigger */}
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={onOpenSidebar} aria-label="Open navigation">
          <Menu className="size-5" />
        </Button>
        <h1 className="truncate text-base font-semibold sm:text-lg">{title}</h1>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Animated theme toggle — sun/moon crossfade */}
        <button
          type="button"
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="relative flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
              {theme === "dark" ? <Sun className="size-5" /> : <Moon className="size-5" />}
            </motion.span>
          </AnimatePresence>
        </button>

        <NotificationsMenu />
        <UserMenu />
      </div>
    </header>
  );
}