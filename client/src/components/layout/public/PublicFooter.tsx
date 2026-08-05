import { Link } from "react-router-dom";
import {
  Mail,
  Phone,
  MapPin,
  Twitter,
  Send,
  Instagram,
  Facebook,
  Youtube,
  ArrowUp,
  type LucideIcon,
  ShieldCheck,
  Globe,
  Zap,
} from "lucide-react";
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

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const footerLinks = [
    {
      title: "Platform",
      links: [
        ...(navLinks || []),
      ],
    },
    {
      title: "Company",
      links: [
        { label: "About", href: "/about" },
        { label: "Compensation Plan", href: "/compensation-plan" },
        { label: "FAQ", href: "/faq" },
      ],
    },
    {
      title: "Legal",
      links: [
        { label: "Terms of Service", href: "/terms" },
        { label: "Privacy Policy", href: "/privacy" },
      ],
    },
  ];

  return (
    <footer className="relative overflow-hidden border-t border-white/[0.06]">
      {/* Background depth */}
      <div className="glow-orb left-[10%] top-0 size-[400px] -translate-y-1/2 bg-blue/5" />
      <div className="glow-orb right-[10%] bottom-0 size-[300px] translate-y-1/2 bg-blue/5" />

      <div className="container relative z-10">
        {/* ── Main footer content ────────────────────────────── */}
        <div className="grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-5">
          {/* Brand column */}
          <div className="lg:col-span-2 space-y-5">
            <Link to="/" className="flex items-center gap-2.5">
              <Logo className="size-9 shadow-glow-blue" />
              <span className="text-xl font-bold text-gradient">{siteName}</span>
            </Link>
            <p className="max-w-sm text-sm text-muted-foreground leading-relaxed">
              {config.tagline || "The premium investment platform that empowers you to grow your wealth with confidence, security, and institutional-grade tools."}
            </p>

            {/* Trust badges */}
            <div className="flex flex-wrap gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-xs text-muted-foreground backdrop-blur-sm">
                <ShieldCheck className="size-3 text-gold" /> SOC2 Compliant
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-xs text-muted-foreground backdrop-blur-sm">
                <Zap className="size-3 text-gold" /> Instant Execution
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-xs text-muted-foreground backdrop-blur-sm">
                <Globe className="size-3 text-gold" /> 45+ Countries
              </span>
            </div>

            {/* Social icons */}
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
                      className="flex size-10 items-center justify-center rounded-xl border border-white/[0.08] text-muted-foreground transition-all duration-300 hover:bg-gold/10 hover:text-gold hover:border-blue/30 hover:shadow-[0_0_16px_-4px_hsl(var(--gold)/0.3)]"
                    >
                      <Icon className="size-4" />
                    </a>
                  );
                })}
            </div>
          </div>

          {/* Link columns */}
          {footerLinks.map((group) => (
            <div key={group.title}>
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-foreground/80">{group.title}</h3>
              <ul className="space-y-2.5">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      to={link.href}
                      className="text-sm text-muted-foreground transition-colors duration-200 hover:text-gold"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Contact row */}
        {(contactDetails.email || contactDetails.phone) && (
          <div className="flex flex-wrap gap-6 border-t border-white/[0.06] py-6">
            {contactDetails.email && (
              <a href={`mailto:${contactDetails.email}`} className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-gold">
                <Mail className="size-4" /> {contactDetails.email}
              </a>
            )}
            {contactDetails.phone && (
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="size-4" /> {contactDetails.phone}
              </span>
            )}
            {contactDetails.address && (
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="size-4" /> {contactDetails.address}
              </span>
            )}
          </div>
        )}

        {/* ── Bottom bar ────────────────────────────────────── */}
        <div className="border-t border-white/[0.06] py-6">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-sm text-muted-foreground">
              {footerText ?? `© ${new Date().getFullYear()} ${siteName}. All rights reserved.`}
            </p>
            <button
              onClick={scrollToTop}
              className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-gold"
              aria-label="Back to top"
            >
              <ArrowUp className="size-4" /> Back to top
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}