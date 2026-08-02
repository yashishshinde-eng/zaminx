import {
  cloneElement,
  forwardRef,
  isValidElement,
  type HTMLAttributes,
  type ReactElement,
} from "react";

type SlotProps = HTMLAttributes<HTMLElement> & { children?: ReactElement };

/**
 * Minimal Slot (Radix-style): merges its own props onto its single child element
 * instead of rendering a wrapper. Used by `Button asChild` to render as a Link etc.
 */
export const Slot = forwardRef<HTMLElement, SlotProps>(
  ({ children, ...props }, ref) => {
    if (!isValidElement(children)) return null;
    const child = children as ReactElement<Record<string, unknown>>;
    return cloneElement(child, mergeProps({ ...props, ref }, child.props));
  },
);
Slot.displayName = "Slot";

function mergeProps(
  slotProps: Record<string, unknown>,
  childProps: Record<string, unknown>,
): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...childProps };

  for (const key in slotProps) {
    const a = slotProps[key];
    const b = childProps[key];
    if (key === "className") {
      merged[key] = [a as string, b as string].filter(Boolean).join(" ");
    } else if (typeof a === "function" && typeof b === "function") {
      merged[key] = (...args: unknown[]) => {
        b(...args);
        a(...args);
      };
    } else {
      merged[key] = a ?? b;
    }
  }
  return merged;
}