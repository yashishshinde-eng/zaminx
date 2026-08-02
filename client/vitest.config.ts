import { defineConfig } from "vitest/config";

/**
 * Phase 20 — client responsive / render-smoke tests.
 *
 * `globals: false` — every test imports { describe, it, expect } from "vitest"
 * explicitly so the strict tsconfig (no global types) keeps compiling.
 */
export default defineConfig({
  test: {
    environment: "happy-dom",
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["./src/test/setup.ts"],
    globals: false,
  },
});