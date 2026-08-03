import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { Menu, X, Moon, Sun } from "lucide-react";
import type { SiteConfig } from "@zaminex/shared";
import { Logo } from "@/components/layout/Logo";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

export function PublicHeader({ config }: { config: SiteConfig }) {
  const { theme, toggleTheme } = useTheme();
  const { isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);

  const navLinks = [
    { label: "Home", href: "/" },
    ...config.navLinks.filter((l) => l.href !== "/"),
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-background/85 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between gap-3">
        <Link to="/" className="flex items-center gap-2" aria-label={config.siteName}>
          <Logo className="size-9" />
          <span className="text-lg font-bold tracking-tight text-gradient">{config.siteName}</span>
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
                  "rounded-[10px] px-3 py-2 text-sm font-medium transition-colors",
                  isActive ? "text-primary" : "text-foreground/70 hover:text-foreground",
                )
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme" className="rounded-full">
            {theme === "dark" ? <Sun className="size-5" /> : <Moon className="size-5" />}
          </Button>
          <div className="hidden sm:flex sm:items-center sm:gap-2">
            <Button variant="ghost" asChild>
              <Link to="/login">Sign in</Link>
            </Button>
            <Button asChild>
              <Link to={isAuthenticated ? "/app" : "/register"}>
                {isAuthenticated ? "Dashboard" : "Get started"}
              </Link>
            </Button>
          </div>
          {/* Mobile toggle */}
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu className="size-5" />
          </Button>
        </div>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-72 bg-background p-4 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <span className="font-semibold">Menu</span>
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Close menu">
                <X className="size-5" />
              </Button>
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
                      "rounded-[10px] px-3 py-2.5 text-sm font-medium",
                      isActive ? "bg-primary text-primary-foreground" : "hover:bg-accent",
                    )
                  }
                >
                  {link.label}
                </NavLink>
              ))}
              <hr className="my-2 border-white/[0.06]" />
              <Button asChild variant="outline">
                <Link to="/login" onClick={() => setOpen(false)}>Sign in</Link>
              </Button>
              <Button asChild onClick={() => setOpen(false)}>
                <Link to={isAuthenticated ? "/app" : "/register"}>
                  {isAuthenticated ? "Dashboard" : "Get started"}
                </Link>
              </Button>
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}