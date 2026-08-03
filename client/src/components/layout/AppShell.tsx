import { useEffect, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { MobileBottomNav } from "./MobileBottomNav";
import { VerifyEmailBanner } from "./VerifyEmailBanner";
import { useSidebarState } from "@/hooks/useSidebarState";
import { pageTransition } from "@/lib/motion";

/**
 * Responsive app shell: collapsible sidebar on lg+, off-canvas drawer on
 * mobile, and a floating bottom tab bar for quick navigation on small screens.
 * Touch targets are ≥44x44px and the layout never produces horizontal scroll.
 * Page bodies animate in/out keyed by the current pathname.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { collapsed } = useSidebarState();
  const location = useLocation();

  // Close the drawer on viewport growth to avoid a stuck overlay.
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = () => setMobileOpen(false);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return (
    <div className="flex h-full min-h-screen bg-background bg-depth">
      {/* Desktop sidebar — width responds to collapse state */}
      <aside
        className={cn(
          "hidden shrink-0 border-r border-sidebar-border transition-[width] duration-300 ease-out lg:block",
          collapsed ? "w-[72px]" : "w-64",
        )}
      >
        <Sidebar />
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "tween", duration: 0.25, ease: "easeOut" }}
              className="absolute left-0 top-0 h-full w-72 shadow-xl"
            >
              <Sidebar mobile onNavigate={() => setMobileOpen(false)} />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onOpenSidebar={() => setMobileOpen(true)} />
        <VerifyEmailBanner />
        {/* pb-28 on mobile gives room for the floating bottom nav (mb-3 + nav height ~80px + safe area) */}
        <main className="flex-1 overflow-x-hidden p-4 pb-28 sm:p-6 lg:pb-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              variants={pageTransition}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Floating bottom tab bar — mobile only */}
      <MobileBottomNav onOpenMenu={() => setMobileOpen(true)} />
    </div>
  );
}