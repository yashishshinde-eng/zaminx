import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

/**
 * Phase 20 — client responsive + render-smoke test. A self-contained component
 * (no app providers) adapts a label to `window.innerWidth`, asserting the mobile
 * / desktop breakpoint flip. Establishes the responsive-test infra; not full
 * page coverage.
 */
function ResponsiveNav() {
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
  return <nav data-testid="nav">{isMobile ? "Mobile menu" : "Desktop bar"}</nav>;
}

function setWidth(px: number) {
  Object.defineProperty(window, "innerWidth", { value: px, writable: true, configurable: true });
}

describe("responsive nav", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders without throwing", () => {
    setWidth(1024);
    render(<ResponsiveNav />);
    expect(screen.getByTestId("nav")).toBeTruthy();
  });

  it("shows the mobile label below the 768px breakpoint", () => {
    setWidth(500);
    render(<ResponsiveNav />);
    expect(screen.getByTestId("nav").textContent).toBe("Mobile menu");
  });

  it("shows the desktop label at/above the 768px breakpoint", () => {
    setWidth(1200);
    render(<ResponsiveNav />);
    expect(screen.getByTestId("nav").textContent).toBe("Desktop bar");
  });
});