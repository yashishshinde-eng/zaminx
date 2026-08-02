import { defineConfig } from "vitest/config";

/** Phase 20 — shared (Zod schema) unit tests. Pure, no environment needed. */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});