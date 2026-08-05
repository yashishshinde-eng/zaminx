import { cn } from "@/lib/utils";
import { useSiteConfig } from "@/hooks/useSiteConfig";
import { useTheme } from "@/context/ThemeContext";

/**
 * Brand logo. Dynamic — renders the admin-configured logo image from the
 * public site config (`cms.logoLight` / `cms.logoDark`, set on the
 * /app/admin/site-config page). Falls back to the branded "Z" badge while the
 * config is loading or when no logo URL has been set.
 *
 * Theme-aware: uses the dark-mode logo when the active theme is dark (and vice
 * versa); if only one variant is configured, it is used for both themes.
 */
export function Logo({ className }: { className?: string }) {
  const { data: config } = useSiteConfig();
  const { theme } = useTheme();

  const src =
    (theme === "dark" ? config?.logoDark : config?.logoLight) ||
    config?.logoLight ||
    config?.logoDark;

  if (src) {
    return (
      <img
        src={src}
        alt={config?.siteName ? `${config.siteName} logo` : "Logo"}
        className={cn("object-contain", className)}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-xl brand-gradient text-primary-foreground font-extrabold shadow-glow-gold",
        className,
      )}
      aria-hidden
    >
      Z
    </div>
  );
}