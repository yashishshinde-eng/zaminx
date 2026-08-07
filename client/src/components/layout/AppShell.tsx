import { type ReactNode, useState } from "react";
import { useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { MobileBottomNav } from "./MobileBottomNav";
import { VerifyEmailBanner } from "./VerifyEmailBanner";
import { useSidebarState } from "@/hooks/useSidebarState";
import { pageTransition } from "@/lib/motion";

/**
 * Premium cinematic app shell — floating glass sidebar + topbar,
 * dashboard background with cinematic depth (gradients, glow orbs,
 * noise, grid). Every pixel intentional.
 *
 * - Regular users: desktop sidebar + mobile bottom nav.
 * - Admin users: desktop sidebar (admin items only) + mobile hamburger sidebar drawer.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const { collapsed } = useSidebarState();
  const { user } = useAuth();
  const location = useLocation();
  const isAdmin = user?.role === "admin";
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="flex h-full min-h-screen dashboard-bg">
      {/* ── Cinematic background layers ────────────────────────── */}
      <div className="pointer-events-none fixed inset-0 z-0" aria-hidden>
        {/* Grid pattern */}
        <div className="absolute inset-0 grid-pattern opacity-40" />
        {/* Noise texture */}
        <div className="absolute inset-0 noise-overlay" />
        {/* Blue glow orb — top left */}
        <div
          className="glow-orb animate-float"
          style={{
            width: 700, height: 700, left: "-12%", top: "-8%",
            background: "radial-gradient(circle, hsl(var(--blue) / 0.12), transparent 70%)",
          }}
        />
        {/* Gold glow orb — top right */}
        <div
          className="glow-orb animate-float-delayed"
          style={{
            width: 500, height: 500, right: "-5%", top: "5%",
            background: "radial-gradient(circle, hsl(var(--gold) / 0.06), transparent 70%)",
          }}
        />
        {/* Purple glow orb — bottom center */}
        <div
          className="glow-orb animate-pulse-glow"
          style={{
            width: 500, height: 500, left: "45%", bottom: "5%",
            background: "radial-gradient(circle, hsl(var(--purple) / 0.06), transparent 70%)",
          }}
        />
        {/* Deep blue glow orb — bottom left */}
        <div
          className="glow-orb animate-float-slow"
          style={{
            width: 600, height: 600, left: "5%", bottom: "-10%",
            background: "radial-gradient(circle, hsl(var(--blue-dark) / 0.06), transparent 70%)",
          }}
        />
      </div>

      {/* ── Desktop sidebar ─────────────────────────────── */}
      <aside
        className={cn(
          "relative z-20 hidden shrink-0 transition-[width] duration-300 ease-out lg:block",
          collapsed ? "w-[78px]" : "w-64",
        )}
      >
        <Sidebar />
      </aside>

      {/* ── Main content ────────────────────────────────── */}
      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        <Topbar onToggleMobileSidebar={isAdmin ? () => setMobileSidebarOpen(true) : undefined} />
        <VerifyEmailBanner />
        <main className={cn("flex-1 overflow-x-hidden px-4 pt-5 sm:px-6 lg:px-8", isAdmin ? "pb-8 lg:pb-8" : "pb-28 lg:pb-8")}>
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

      {/* ── Mobile bottom nav — regular users only ──────────── */}
      {!isAdmin && <MobileBottomNav />}

      {/* ── Mobile sidebar drawer — admin only ──────────────── */}
      {isAdmin && (
        <AnimatePresence>
          {mobileSidebarOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
                onClick={() => setMobileSidebarOpen(false)}
              />
              {/* Slide-in sidebar */}
              <motion.aside
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "tween", duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="fixed inset-y-0 left-0 z-50 w-64 lg:hidden"
              >
                <Sidebar mobile onNavigate={() => setMobileSidebarOpen(false)} />
              </motion.aside>
            </>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}