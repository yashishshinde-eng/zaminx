import { Link } from "react-router-dom";
import { Mail, Phone, MapPin, Twitter, Send, Instagram, Facebook, Youtube, type LucideIcon } from "lucide-react";
import type { SiteConfig } from "@zaminex/shared";
import { Logo } from "@/components/layout/Logo";

const SOCIAL_ICONS: Record<string, LucideIcon> = {
  twitter: Twitter,
  telegram: Send,
  instagram: Instagram,
  facebook: Facebook,
  youtube: Youtube,
};

export function PublicFooter({ config }: { config: SiteConfig }) {
  const { contactDetails, socialLinks, navLinks, footerText, siteName } = config;

  return (
    <footer className="border-t border-white/[0.06] bg-card/50">
      <div className="container grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-3">
          <Link to="/" className="flex items-center gap-2">
            <Logo className="size-8" />
            <span className="text-lg font-bold text-gradient">{siteName}</span>
          </Link>
          <p className="text-sm text-muted-foreground">{config.tagline}</p>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold">Explore</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {navLinks.map((l) => (
              <li key={l.href}>
                <Link to={l.href} className="hover:text-primary transition-colors">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold">Contact</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {contactDetails.email && (
              <li className="flex items-center gap-2">
                <Mail className="size-4 shrink-0" />
                <a href={`mailto:${contactDetails.email}`} className="hover:text-primary transition-colors">{contactDetails.email}</a>
              </li>
            )}
            {contactDetails.phone && (
              <li className="flex items-center gap-2">
                <Phone className="size-4 shrink-0" />
                <span>{contactDetails.phone}</span>
              </li>
            )}
            {contactDetails.address && (
              <li className="flex items-start gap-2">
                <MapPin className="size-4 shrink-0" />
                <span>{contactDetails.address}</span>
              </li>
            )}
          </ul>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold">Connect</h3>
          <div className="flex gap-3">
            {Object.entries(socialLinks)
              .filter(([, url]) => !!url)
              .map(([key, url]) => {
                const Icon = SOCIAL_ICONS[key] ?? Link;
                return (
                  <a
                    key={key}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={key}
                    className="flex size-10 items-center justify-center rounded-[14px] border border-white/[0.08] text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary hover:border-primary/30"
                  >
                    <Icon className="size-4" />
                  </a>
                );
              })}
          </div>
        </div>
      </div>

      <div className="border-t border-white/[0.06] py-6">
        <div className="container flex flex-col items-center justify-between gap-2 text-sm text-muted-foreground sm:flex-row">
          <p>{footerText ?? `© ${new Date().getFullYear()} ${siteName}.`}</p>
          <div className="flex gap-4">
            <Link to="/terms" className="hover:text-primary transition-colors">Terms</Link>
            <Link to="/privacy" className="hover:text-primary transition-colors">Privacy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}