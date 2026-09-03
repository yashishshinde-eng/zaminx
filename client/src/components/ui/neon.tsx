/* ═══════════════════════════════════════════════════════════════════════
 *  LIVING NEON WALLET — reusable presentation primitives.
 *
 *  Pure presentation layer. No data, routing or business logic of their
 *  own — callers wire those. Three building blocks:
 *
 *    <NeonCard>         animated traveling-light border + glass surface
 *    <GlowIcon>         line icon with controlled neon edge glow
 *    <NeonActionButton> premium 3D mini action card (icon + label)
 *
 *  Color identity is selected via the `variant` prop. Each variant maps
 *  to a CSS class that sets the --neon-* custom properties consumed by
 *  the styles in index.css.
 * ═══════════════════════════════════════════════════════════════════════ */
import { forwardRef, type CSSProperties, type ElementType, type ReactNode } from "react";
import { Link } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type NeonVariant =
  | "gold"
  | "green"
  | "violet"
  | "blue"
  | "orange"
  | "cyan"
  | "magenta"
  | "goldcyan";

const NEON_CLASS: Record<NeonVariant, string> = {
  gold: "neon-gold",
  green: "neon-green",
  violet: "neon-violet",
  blue: "neon-blue",
  orange: "neon-orange",
  cyan: "neon-cyan",
  magenta: "neon-magenta",
  goldcyan: "neon-goldcyan",
};

/** Hex accent + "R G B" triplet per variant, for inline glow styling. */
export const NEON_COLORS: Record<
  NeonVariant,
  { a: string; b: string; rgb: string }
> = {
  gold:     { a: "#FFD43B", b: "#FFB300", rgb: "255 196 59" },
  green:    { a: "#22E676", b: "#00C853", rgb: "34 230 118" },
  violet:   { a: "#9B5CFF", b: "#5B5CFF", rgb: "120 92 255" },
  blue:     { a: "#00B7FF", b: "#4169FF", rgb: "0 167 255" },
  orange:   { a: "#FF8A3D", b: "#FF4D6D", rgb: "255 110 90" },
  cyan:     { a: "#00E5FF", b: "#2979FF", rgb: "0 213 255" },
  magenta:  { a: "#8B5CFF", b: "#FF4FD8", rgb: "200 90 240" },
  goldcyan: { a: "#FFD54A", b: "#00D9FF", rgb: "255 200 80" },
};

/* ── NeonCard ─────────────────────────────────────────────────────────── */
interface NeonCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: NeonVariant;
  /** Render as a different element (e.g. motion.div via className). */
  as?: ElementType;
  /** Disable the traveling beam (static glow only). Defaults false. */
  staticBorder?: boolean;
}

export const NeonCard = forwardRef<HTMLDivElement, NeonCardProps>(
  ({ variant = "gold", as: Comp = "div", staticBorder = false, className, children, style, ...props }, ref) => {
    return (
      <Comp
        ref={ref}
        className={cn("neon-card", NEON_CLASS[variant], staticBorder && "neon-card-static", className)}
        style={style}
        {...props}
      >
        {children}
      </Comp>
    );
  },
);
NeonCard.displayName = "NeonCard";

/* ── GlowIcon ─────────────────────────────────────────────────────────── */
interface GlowIconProps {
  icon: LucideIcon;
  variant?: NeonVariant;
  size?: number;
  iconSize?: number;
  className?: string;
  strokeWidth?: number;
}

export function GlowIcon({
  icon: Icon,
  variant = "blue",
  size = 40,
  iconSize = 18,
  className,
  strokeWidth = 2.2,
}: GlowIconProps) {
  const c = NEON_COLORS[variant];
  return (
    <span
      className={cn("glow-icon", className)}
      style={
        {
          width: size,
          height: size,
          "--gi-color": c.a,
          "--gi-glow-rgb": c.rgb,
        } as CSSProperties
      }
    >
      <Icon className="shrink-0" width={iconSize} height={iconSize} strokeWidth={strokeWidth} />
    </span>
  );
}

/* ── NeonActionButton ─────────────────────────────────────────────────── */
interface NeonActionButtonProps {
  icon: LucideIcon;
  label: string;
  variant: NeonVariant;
  /** Route to navigate to (renders a <Link>). */
  to?: string;
  /** Click handler (renders a <button>). Takes precedence over `to`. */
  onClick?: () => void;
  disabled?: boolean;
  /** Tooltip/title for disabled state. */
  disabledTitle?: string;
  className?: string;
  iconSize?: number;
  children?: ReactNode;
}

export function NeonActionButton({
  icon: Icon,
  label,
  variant,
  to,
  onClick,
  disabled = false,
  disabledTitle,
  className,
  iconSize = 20,
  children,
}: NeonActionButtonProps) {
  const c = NEON_COLORS[variant];
  const inner = (
    <>
      {/* Glowing icon disc */}
      <span
        className="glow-icon mb-0.5"
        style={
          {
            width: 38,
            height: 38,
            borderRadius: 14,
            "--gi-color": c.a,
            "--gi-glow-rgb": c.rgb,
          } as CSSProperties
        }
      >
        <Icon className="shrink-0" width={iconSize} height={iconSize} strokeWidth={2.3} />
      </span>
      <span className="text-[12px] font-bold tracking-tight text-foreground/90 sm:text-[13px]">
        {label}
      </span>
      {children}
    </>
  );

  const cls = cn("neon-card neon-action", NEON_CLASS[variant], disabled && "is-disabled", className);

  if (disabled) {
    return (
      <div className={cls} aria-disabled title={disabledTitle}>
        {inner}
      </div>
    );
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cls}>
        {inner}
      </button>
    );
  }
  return (
    <Link to={to ?? "#"} className={cls}>
      {inner}
    </Link>
  );
}