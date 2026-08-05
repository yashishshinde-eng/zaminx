import { useState, useEffect } from "react";
import { Link, NavLink } from "react-router-dom";
import { Menu, X, Moon, Sun, ArrowRight } from "lucide-react";
import type { SiteConfig } from "@zaminex/shared";
import { Logo } from "@/components/layout/Logo";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export function PublicHeader({ config }: { config: SiteConfig }) {
  const { theme, toggleTheme } = useTheme();
  const { isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Track scroll for glassmorphism effect
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navLinks = [
    { label: "Home", href: "/" },
    ...config.navLinks.filter((l) => l.href !== "/"),
  ];

  return (
    <>
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-500",
          scrolled
            ? "nav-glass shadow-card"
            : "bg-transparent",
        )}
      >
        {/* Gold accent line at top */}
        <div className="absolute inset-x-0 top-0 h-px gradient-blue opacity-60" />

        <div className="container flex h-18 items-center justify-between gap-3 sm:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group" aria-label={config.siteName}>
            <Logo className="size-9 shadow-glow-blue group-hover:scale-105 transition-transform duration-300" />
            <span className="text-lg font-bold tracking-tight text-gradient-gold">{config.siteName}</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 lg:flex">
            {navLinks.map((link) => (
              <NavLink
                key={link.href}
                to={link.href}
                end={link.href === "/"}
                className={({ isActive }) =>
                  cn(
                    "rounded-[10px] px-4 py-2 text-sm font-medium transition-all duration-300",
                    isActive
                      ? "text-gold"
                      : "text-foreground/70 hover:text-foreground hover:bg-white/[0.04]",
                  )
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="relative flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
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

            <div className="hidden sm:flex sm:items-center sm:gap-2">
              <Button variant="ghost" asChild className="text-foreground/70 hover:text-foreground">
                <Link to="/login">Sign in</Link>
              </Button>
              <Button asChild className="btn-premium h-10 px-6 text-sm">
                <Link to={isAuthenticated ? "/app" : "/register"}>
                  {isAuthenticated ? "Dashboard" : "Get started"} <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>

            {/* Mobile toggle */}
            <button
              className="flex size-10 items-center justify-center rounded-xl text-foreground/80 transition-colors hover:bg-white/[0.06] lg:hidden"
              onClick={() => setOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="size-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.3, ease: "easeOut" }}
              className="absolute right-0 top-0 h-full w-80 glass-card rounded-l-[24px] p-6 shadow-xl overflow-y-auto"
            >
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Logo className="size-8 shadow-glow-blue" />
                  <span className="font-bold text-gradient-gold">{config.siteName}</span>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Close menu"
                  className="flex size-9 items-center justify-center rounded-xl text-foreground/70 transition-colors hover:bg-white/[0.06]"
                >
                  <X className="size-5" />
                </button>
              </div>

              <nav className="flex flex-col gap-1">
                {navLinks.map((link) => (
                  <NavLink
                    key={link.href}
                    to={link.href}
                    end={link.href === "/"}
                    onClick={() => setOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        "rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200",
                        isActive
                          ? "gradient-blue text-white shadow-glow-blue"
                          : "text-foreground/70 hover:bg-white/[0.04] hover:text-foreground",
                      )
                    }
                  >
                    {link.label}
                  </NavLink>
                ))}
              </nav>

              <div className="mt-6 space-y-3 border-t border-white/[0.08] pt-6">
                <Button asChild variant="outline" className="w-full">
                  <Link to="/login" onClick={() => setOpen(false)}>Sign in</Link>
                </Button>
                <Button asChild className="btn-premium w-full">
                  <Link to={isAuthenticated ? "/app" : "/register"} onClick={() => setOpen(false)}>
                    {isAuthenticated ? "Dashboard" : "Get started"} <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}