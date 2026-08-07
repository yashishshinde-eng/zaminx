import type { ReactNode } from "react";
import type { SiteConfig } from "@zeminex/shared";
import { useAuth } from "@/context/AuthContext";
import { Logo } from "@/components/layout/Logo";

/** Shows a maintenance screen for guests when the site is in maintenance mode. */
export function MaintenanceGate({ config, children }: { config: SiteConfig; children: ReactNode }) {
  const { user } = useAuth();

  if (!config.maintenanceMode.enabled) return <>{children}</>;
  // Admins always pass through so they can review the site.
  if (user?.role === "admin") return <>{children}</>;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-6 text-center">
      <Logo className="size-14" />
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">We&apos;ll be right back</h1>
        <p className="max-w-md text-muted-foreground">
          {config.maintenanceMode.message || "Zeminex Global is undergoing scheduled maintenance. Please check back shortly."}
        </p>
      </div>
    </div>
  );
}