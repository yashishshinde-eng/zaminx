import { cn } from "@/lib/utils";

interface AvatarProps {
  /** Optional image source. When omitted, initials are shown on a gradient. */
  src?: string | null;
  alt: string;
  /** Initials to show when there's no image (or the image fails). Defaults to "?". */
  fallback?: string;
  className?: string;
  /** Size preset. */
  size?: "sm" | "md" | "lg";
}

const SIZES = {
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-12 text-base",
} as const;

/** Circular avatar — image when available, otherwise initials on a brand gradient. */
export function Avatar({ src, alt, fallback, className, size = "md" }: AvatarProps) {
  const initials = (fallback ?? alt ?? "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("") || "?";

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full font-semibold",
        SIZES[size],
        className,
      )}
    >
      {src ? (
        <img src={src} alt={alt} className="h-full w-full object-cover" />
      ) : (
        <span className="brand-gradient flex h-full w-full items-center justify-center text-primary-foreground">
          {initials}
        </span>
      )}
    </span>
  );
}