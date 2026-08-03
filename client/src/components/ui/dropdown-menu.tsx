import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useClickOutside } from "@/hooks/useClickOutside";
import { Separator } from "./separator";

/**
 * Hand-ported dropdown menu (no Radix). Follows the dialog.tsx portal precedent:
 * content is portaled to document.body and positioned absolutely relative to the
 * trigger. Managed via a small context so items get the close handler automatically.
 *
 * Controlled usage: `<DropdownMenu trigger={…}><DropdownMenuContent>…</DropdownMenuContent></DropdownMenu>`
 * The trigger is wrapped in a button-less slot that toggles `open` on click.
 */

type Side = "bottom" | "top" | "right" | "left";
interface DropdownMenuContextValue {
  open: boolean;
  setOpen: (v: boolean) => void;
  triggerRef: React.RefObject<HTMLElement | null>;
  contentId: string;
  close: () => void;
}
const DropdownMenuContext = createContext<DropdownMenuContextValue | null>(null);
function useDropdownMenu() {
  const ctx = useContext(DropdownMenuContext);
  if (!ctx) throw new Error("DropdownMenu components must be used within <DropdownMenu>");
  return ctx;
}

interface DropdownMenuProps {
  trigger: ReactNode;
  children: (close: () => void) => ReactNode;
  /** Where the content opens relative to the trigger. */
  side?: Side;
  align?: "start" | "center" | "end";
  className?: string;
}

export function DropdownMenu({ trigger, children, side = "bottom", align = "end", className }: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLElement | null>(null);
  const contentId = useId();
  const close = useCallback(() => setOpen(false), []);

  return (
    <DropdownMenuContext.Provider value={{ open, setOpen, triggerRef, contentId, close }}>
      <span
        ref={triggerRef as React.RefObject<HTMLSpanElement>}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex"
      >
        {trigger}
      </span>
      {open && (
        <DropdownMenuContent side={side} align={align} className={className}>
          {children(close)}
        </DropdownMenuContent>
      )}
    </DropdownMenuContext.Provider>
  );
}

interface DropdownMenuContentProps {
  children: ReactNode;
  side?: Side;
  align?: "start" | "center" | "end";
  className?: string;
}

function DropdownMenuContent({ children, side = "bottom", align = "end", className }: DropdownMenuContentProps) {
  const { open, triggerRef, close, contentId } = useDropdownMenu();
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const contentRef = useClickOutside<HTMLDivElement>(() => close());

  // Position the content under (or beside) the trigger once mounted.
  useEffect(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const scrollY = window.scrollY;
    const scrollX = window.scrollX;
    let top: number;
    let left: number;
    if (side === "bottom") top = rect.bottom + scrollY + 8;
    else if (side === "top") top = rect.top + scrollY - 8; // adjusted after measuring height
    else top = rect.top + scrollY;
    if (side === "right") left = rect.right + scrollX + 8;
    else if (side === "left") left = rect.left + scrollX - 8; // adjusted after measuring width
    else left = rect.left + scrollX;
    if (side === "bottom" || side === "top") {
      if (align === "end") left = rect.right + scrollX;
      else if (align === "center") left = rect.left + scrollX + rect.width / 2;
    }
    setCoords({ top, left });
  }, [triggerRef, side, align]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close]);

  if (!coords) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          ref={contentRef}
          id={contentId}
          role="menu"
          initial={{ opacity: 0, scale: 0.96, y: -4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -4 }}
          transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
          style={{ position: "absolute", top: coords.top, left: coords.left, zIndex: 60 }}
          className={cn(
            "glass-card min-w-[12rem] origin-top-right overflow-hidden p-1 text-popover-foreground",
            align === "end" && (side === "bottom" || side === "top") && "-translate-x-[calc(100%-0px)]",
            className,
          )}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

interface DropdownMenuItemProps {
  children: ReactNode;
  onSelect?: () => void;
  className?: string;
  /** Render as a link (e.g. to /app/settings) instead of a button. */
  as?: "a";
  href?: string;
  disabled?: boolean;
  /** Destructive styling (Sign out, Delete). */
  destructive?: boolean;
}

export function DropdownMenuItem({
  children,
  onSelect,
  className,
  as,
  href,
  disabled,
  destructive,
}: DropdownMenuItemProps) {
  const { close } = useDropdownMenu();
  const handle = (e: React.MouseEvent) => {
    e.preventDefault();
    if (disabled) return;
    onSelect?.();
    close();
  };
  const classes = cn(
    "flex w-full cursor-pointer items-center gap-2 rounded-[10px] px-2.5 py-2 text-sm outline-none transition-colors focus-visible:bg-accent focus-visible:text-accent-foreground disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
    destructive ? "text-destructive hover:bg-destructive/10 focus-visible:bg-destructive/10" : "hover:bg-accent",
    className,
  );
  if (as === "a" && href) {
    return (
      <a role="menuitem" href={href} onClick={handle} className={classes}>
        {children}
      </a>
    );
  }
  return (
    <button type="button" role="menuitem" disabled={disabled} onClick={handle} className={classes}>
      {children}
    </button>
  );
}

export function DropdownMenuLabel({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("px-2.5 py-1.5 text-xs font-semibold text-muted-foreground", className)}>{children}</div>;
}

export function DropdownMenuSeparator() {
  return <Separator className="my-1" />;
}