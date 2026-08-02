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
import type { ContentBlock } from "@zaminex/shared";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
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
        <Button>
          {label} <ArrowRight className="size-4" />
        </Button>
      </a>
    );
  }
  return (
    <Button asChild>
      <Link to={href}>
        {label} <ArrowRight className="size-4" />
      </Link>
    </Button>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 py-4 text-left"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2 font-medium">
          <HelpCircle className="size-4 shrink-0 text-primary" />
          {q}
        </span>
        <ChevronDown className={cn("size-4 shrink-0 transition-transform", open && "rotate-180")} />
      </button>
      {open && <p className="pb-4 text-sm text-muted-foreground">{a}</p>}
    </div>
  );
}

export function BlockRenderer({ blocks }: { blocks: ContentBlock[] }) {
  return (
    <div className="space-y-10">
      {blocks.map((block, i) => {
        switch (block.type) {
          case "hero":
            return (
              <section key={i} className="flex flex-col items-center gap-5 py-10 text-center sm:py-16">
                <h1 className="max-w-3xl text-4xl font-extrabold tracking-tight sm:text-6xl">{block.title}</h1>
                {block.subtitle && <p className="max-w-2xl text-lg text-muted-foreground">{block.subtitle}</p>}
                {block.ctaLabel && block.ctaHref && <CtaLink href={block.ctaHref} label={block.ctaLabel} />}
              </section>
            );

          case "heading": {
            const Tag = (`h${block.level}` as "h1" | "h2" | "h3");
            const size = block.level === 1 ? "text-3xl sm:text-4xl" : block.level === 2 ? "text-2xl sm:text-3xl" : "text-xl sm:text-2xl";
            return (
              <Tag key={i} className={cn("scroll-mt-24 font-bold tracking-tight", size)}>
                {block.text}
              </Tag>
            );
          }

          case "paragraph":
            return (
              <p key={i} className="max-w-3xl text-base leading-relaxed text-muted-foreground">
                {block.text}
              </p>
            );

          case "features":
            return (
              <div key={i} className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {block.items.map((item, j) => {
                  const Icon = resolveIcon(item.icon);
                  return (
                    <Card key={j}>
                      <CardHeader>
                        {Icon && (
                          <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <Icon className="size-6" />
                          </div>
                        )}
                        <CardTitle className="mt-3 text-lg">{item.title}</CardTitle>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      </CardHeader>
                    </Card>
                  );
                })}
              </div>
            );

          case "steps":
            return (
              <ol key={i} className="space-y-4">
                {block.items.map((item, j) => (
                  <li key={j} className="flex gap-4">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                      {j + 1}
                    </div>
                    <div>
                      <p className="font-semibold">{item.title}</p>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                  </li>
                ))}
              </ol>
            );

          case "faq":
            return (
              <div key={i} className="mx-auto max-w-3xl rounded-lg border bg-card px-4">
                {block.items.map((item, j) => (
                  <FaqItem key={j} q={item.question} a={item.answer} />
                ))}
              </div>
            );

          case "cta":
            return (
              <section key={i} className="rounded-xl border bg-primary/5 p-8 text-center sm:p-12">
                <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{block.title}</h2>
                {block.description && <p className="mx-auto mt-2 max-w-xl text-muted-foreground">{block.description}</p>}
                {block.ctaLabel && block.ctaHref && (
                  <div className="mt-6 flex justify-center">
                    <CtaLink href={block.ctaHref} label={block.ctaLabel} />
                  </div>
                )}
              </section>
            );

          default:
            return null;
        }
      })}
    </div>
  );
}