import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-lg bg-primary text-primary-foreground font-extrabold",
        className,
      )}
      aria-hidden
    >
      Z
    </div>
  );
}