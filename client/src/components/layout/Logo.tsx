import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-xl gradient-blue text-white font-extrabold shadow-glow-blue",
        className,
      )}
      aria-hidden
    >
      Z
    </div>
  );
}