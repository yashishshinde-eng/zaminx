import { Outlet, useLocation } from "react-router-dom";
import { useSiteConfig } from "@/hooks/useSiteConfig";
import { AnnouncementBar } from "./AnnouncementBar";
import { PublicHeader } from "./PublicHeader";
import { PublicFooter } from "./PublicFooter";
import { MaintenanceGate } from "./MaintenanceGate";
import { FullPageLoader } from "@/components/layout/FullPageLoader";
import type { SiteConfig } from "@zaminex/shared";

const FALLBACK_CONFIG: SiteConfig = {
  siteName: "Zaminex",
  logoLight: null,
  logoDark: null,
  navLinks: [{ label: "Home", href: "/" }],
  contactDetails: {},
  socialLinks: {},
  seoDefaults: {},
  announcementBar: { enabled: false, message: "" },
  maintenanceMode: { enabled: false, message: "" },
};

export function PublicLayout() {
  const { data, isLoading, isError } = useSiteConfig();
  const config = data ?? FALLBACK_CONFIG;
  const location = useLocation();

  // Home page has a transparent header that overlays the hero section,
  // so it needs no top padding. Other pages need padding for the fixed header.
  const isHome = location.pathname === "/";

  if (isLoading) return <FullPageLoader />;

  // If the site config fails to load, still render with a fallback so the
  // public site never hard-breaks — admins can fix CMS settings later.
  void isError;

  return (
    <MaintenanceGate config={config}>
      <div className="flex min-h-screen flex-col bg-background bg-depth">
        <AnnouncementBar bar={config.announcementBar} />
        <PublicHeader config={config} />
        <main className={`flex-1 ${isHome ? "" : "pt-20 sm:pt-24"}`}>
          <Outlet />
        </main>
        <PublicFooter config={config} />
      </div>
    </MaintenanceGate>
  );
}