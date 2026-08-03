import { cn } from "@/lib/utils";

interface SeparatorProps {
  /** "horizontal" (default) renders a 1px-high rule; "vertical" a 1px-wide rule. */
  orientation?: "horizontal" | "vertical";
  className?: string;
  /** Decorative separators omit the role. */
  decorative?: boolean;
}

/** A theme-aware divider — used inside dropdown menus and sectioned cards. */
export function Separator({ orientation = "horizontal", className, decorative = true }: SeparatorProps) {
  return (
    <div
      role={decorative ? undefined : "separator"}
      aria-orientation={decorative ? undefined : orientation}
      className={cn(
        "shrink-0 bg-border",
        orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
        className,
      )}
    />
  );
}