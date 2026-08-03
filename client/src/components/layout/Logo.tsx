import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
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