import { useCallback, useEffect, useState } from "react";
import { STORAGE_KEYS } from "@/config";

/**
 * Collapsed state for the desktop sidebar, persisted to localStorage so it
 * survives reloads. The mobile sidebar is always expanded (off-canvas drawer)
 * regardless of this state.
 */
export function useSidebarState() {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(STORAGE_KEYS.sidebarCollapsed) === "1";
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.sidebarCollapsed, collapsed ? "1" : "0");
  }, [collapsed]);

  const toggle = useCallback(() => setCollapsed((c) => !c), []);
  const setCollapsedState = useCallback((value: boolean) => setCollapsed(value), []);

  return { collapsed, toggle, setCollapsed: setCollapsedState } as const;
}