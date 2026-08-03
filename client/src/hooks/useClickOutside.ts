import { useEffect, useRef, type RefObject } from "react";

/**
 * Calls `handler` when a pointer/touch event occurs outside the referenced element.
 * Used by dropdown menus and popovers to close on outside click.
 *
 * @example const ref = useClickOutside<HTMLDivElement>(() => setOpen(false));
 */
export function useClickOutside<T extends HTMLElement>(
  handler: (event: MouseEvent | TouchEvent) => void,
  enabled = true,
): RefObject<T> {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!enabled) return;
    const listener = (event: MouseEvent | TouchEvent) => {
      const el = ref.current;
      if (!el || el.contains(event.target as Node)) return;
      handler(event);
    };
    document.addEventListener("mousedown", listener);
    document.addEventListener("touchstart", listener);
    return () => {
      document.removeEventListener("mousedown", listener);
      document.removeEventListener("touchstart", listener);
    };
  }, [handler, enabled]);

  return ref;
}