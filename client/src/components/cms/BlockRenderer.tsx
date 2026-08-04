import { Link } from "react-router-dom";
import {
  TrendingUp,
  Users,
  Wallet,
  ShieldCheck,
  ScrollText,
  Zap,
  ArrowRight,
  ChevronDown,
  HelpCircle,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ContentBlock } from "@zaminex/shared";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Map of allowed icon names → lucide components (whitelist, no arbitrary import). */
const ICONS: Record<string, LucideIcon> = {
  TrendingUp,
  Users,
  Wallet,
  ShieldCheck,
  ScrollText,
  Zap,
};

function resolveIcon(name?: string): LucideIcon | undefined {
  return name ? ICONS[name] : undefined;
}

/** External vs internal link resolution. */
function isExternal(href: string): boolean {
  return /^https?:\/\//i.test(href);
}

function CtaLink({ href, label }: { href: string; label: string }) {
  if (isExternal(href)) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer">
        <Button className="btn-premium h-12 px-8 text-base">
          {label} <ArrowRight className="size-4" />
        </Button>
      </a>
    );
  }
  return (
    <Button asChild className="btn-premium h-12 px-8 text-base">
      <Link to={href}>
        {label} <ArrowRight className="size-4" />
      </Link>
    </Button>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="glass-accordion">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 p-5 text-left"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2 font-semibold">
          <HelpCircle className="size-4 shrink-0 text-gold" />
          {q}
        </span>
        <ChevronDown className={cn("size-4 shrink-0 transition-transform duration-300 text-muted-foreground", open && "rotate-180")} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            <p className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function BlockRenderer({ blocks }: { blocks: ContentBlock[] }) {
  return (
    <div className="space-y-16">
      {blocks.map((block, i) => {
        switch (block.type) {
          case "hero":
            return (
              <section key={i} className="hero-bg noise-overlay relative overflow-hidden flex flex-col items-center gap-6 py-16 text-center sm:py-24 rounded-[24px]">
                {/* Background orbs */}
                <div className="glow-orb left-[10%] top-[-20%] size-[400px] bg-blue/10" />
                <div className="glow-orb right-[10%] bottom-[-10%] size-[300px] bg-blue/8" />
                <div className="relative z-10">
                  <h1 className="font-grotesk max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl hero-gradient-text">
                    {block.title}
                  </h1>
                  {block.subtitle && (
                    <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground sm:text-xl">
                      {block.subtitle}
                    </p>
                  )}
                  {block.ctaLabel && block.ctaHref && (
                    <div className="mt-8 flex justify-center">
                      <CtaLink href={block.ctaHref} label={block.ctaLabel} />
                    </div>
                  )}
                </div>
              </section>
            );

          case "heading": {
            const Tag = (`h${block.level}` as "h1" | "h2" | "h3");
            const size = block.level === 1 ? "text-3xl sm:text-5xl" : block.level === 2 ? "text-2xl sm:text-4xl" : "text-xl sm:text-2xl";
            return (
              <Tag key={i} className={cn("scroll-mt-24 font-bold tracking-tight font-grotesk", size, block.level <= 2 && "text-gradient")}>
                {block.text}
              </Tag>
            );
          }

          case "paragraph":
            return (
              <p key={i} className="mx-auto max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                {block.text}
              </p>
            );

          case "features":
            return (
              <div key={i} className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {block.items.map((item, j) => {
                  const Icon = resolveIcon(item.icon);
                  return (
                    <div key={j} className="feature-card group">
                      {Icon && (
                        <div className="feature-icon mb-5">
                          <Icon className="size-6 text-gold" />
                        </div>
                      )}
                      <h3 className="text-lg font-semibold tracking-tight">{item.title}</h3>
                      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{item.description}</p>
                    </div>
                  );
                })}
              </div>
            );

          case "steps":
            return (
              <div key={i} className="mx-auto max-w-2xl">
                <div className="glass-card p-6 sm:p-8 space-y-6">
                  {block.items.map((item, j) => (
                    <div key={j} className="flex gap-4 items-start">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl gradient-blue text-primary-foreground font-bold text-sm shadow-glow-blue">
                        {j + 1}
                      </div>
                      <div className="pt-1">
                        <p className="font-semibold">{item.title}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );

          case "faq":
            return (
              <div key={i} className="mx-auto max-w-3xl space-y-3">
                {block.items.map((item, j) => (
                  <FaqItem key={j} q={item.question} a={item.answer} />
                ))}
              </div>
            );

          case "cta":
            return (
              <section key={i} className="cta-bg relative overflow-hidden rounded-[24px] border border-blue/10 p-8 text-center sm:p-14">
                <div className="glow-orb left-[-10%] top-[-20%] size-[300px] bg-blue/8" />
                <div className="relative z-10">
                  <h2 className="font-grotesk text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">{block.title}</h2>
                  {block.description && (
                    <p className="mx-auto mt-3 max-w-xl text-muted-foreground sm:text-lg">{block.description}</p>
                  )}
                  {block.ctaLabel && block.ctaHref && (
                    <div className="mt-8 flex justify-center">
                      <CtaLink href={block.ctaHref} label={block.ctaLabel} />
                    </div>
                  )}
                </div>
              </section>
            );

          default:
            return null;
        }
      })}
    </div>
  );
}