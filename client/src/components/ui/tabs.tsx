import { createContext, useContext, useId, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Hand-ported accessible tabs (no Radix). Context-based with an animated active
 * indicator (framer-motion `layoutId`), plus a compact `SegmentedControl` variant
 * used for the dashboard chart period toggle.
 */

interface TabsContextValue {
  value: string;
  setValue: (v: string) => void;
  baseId: string;
}
const TabsContext = createContext<TabsContextValue | null>(null);
function useTabs() {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error("Tabs components must be used within <Tabs>");
  return ctx;
}

interface TabsProps {
  value?: string;
  defaultValue: string;
  onValueChange?: (v: string) => void;
  children: ReactNode;
  className?: string;
}

export function Tabs({ value: controlled, defaultValue, onValueChange, children, className }: TabsProps) {
  const [internal, setInternal] = useState(defaultValue);
  const value = controlled ?? internal;
  const baseId = useId();
  const setValue = (v: string) => {
    setInternal(v);
    onValueChange?.(v);
  };
  return (
    <TabsContext.Provider value={{ value, setValue, baseId }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex items-center gap-1 rounded-lg bg-muted p-1 text-muted-foreground",
        className,
      )}
    >
      {children}
    </div>
  );
}

interface TabsTriggerProps {
  value: string;
  children: ReactNode;
  className?: string;
}

export function TabsTrigger({ value, children, className }: TabsTriggerProps) {
  const { value: active, setValue, baseId } = useTabs();
  const selected = active === value;
  return (
    <button
      type="button"
      role="tab"
      id={`${baseId}-tab-${value}`}
      aria-selected={selected}
      aria-controls={`${baseId}-panel-${value}`}
      onClick={() => setValue(value)}
      className={cn(
        "relative inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&_svg]:size-4 [&_svg]:shrink-0",
        selected ? "text-foreground" : "hover:text-foreground",
        className,
      )}
    >
      {selected && (
        <motion.span
          layoutId={`${baseId}-tab-active`}
          className="absolute inset-0 rounded-md bg-card shadow-sm"
          transition={{ type: "spring", stiffness: 400, damping: 32 }}
        />
      )}
      <span className="relative z-10">{children}</span>
    </button>
  );
}

interface TabsContentProps {
  value: string;
  children: ReactNode;
  className?: string;
}

export function TabsContent({ value, children, className }: TabsContentProps) {
  const { value: active, baseId } = useTabs();
  if (active !== value) return null;
  return (
    <div role="tabpanel" id={`${baseId}-panel-${value}`} aria-labelledby={`${baseId}-tab-${value}`} className={className}>
      {children}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  SegmentedControl — compact pill toggle (e.g. 7d / 30d / 90d)               */
/* -------------------------------------------------------------------------- */

interface SegmentedControlProps {
  value: string;
  onValueChange: (v: string) => void;
  options: { value: string; label: ReactNode }[];
  className?: string;
}

export function SegmentedControl({ value, onValueChange, options, className }: SegmentedControlProps) {
  const baseId = useId();
  return (
    <div
      role="tablist"
      className={cn("inline-flex items-center rounded-md border border-border bg-muted/50 p-0.5", className)}
    >
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onValueChange(opt.value)}
            className={cn(
              "relative inline-flex items-center justify-center rounded-[5px] px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              selected ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {selected && (
              <motion.span
                layoutId={`${baseId}-segment-active`}
                className="absolute inset-0 rounded-[5px] brand-gradient shadow-sm"
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
              />
            )}
            <span className="relative z-10">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}