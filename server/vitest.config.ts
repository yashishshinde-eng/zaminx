import { defineConfig } from "vitest/config";

/**
 * Phase 20 — server test config.
 *
 * `singleFork: true` runs the whole suite in one child process so a single test
 * Mongo connection is shared across files. `beforeEach(clearDb)` resets state
 * between tests. (vitest 4: `singleFork` is a top-level option, not nested under
 * `poolOptions.forks`.)
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/test/**/*.test.ts"],
    pool: "forks",
    singleFork: true,
    setupFiles: ["./src/test/setup.ts"],
    globalSetup: ["./src/test/globalSetup.ts"],
    // globalSetup probes the test DB once; if unreachable, integration tests skip.
    testTimeout: 20_000,
    // One retry: the shared Atlas M0 cluster intermittently drops in-flight
    // writes under sustained multi-file load (register/login `save()`s fail
    // with DocumentNotFoundError, on the clean tree too). A retry turns those
    // environmental blips into the deterministic result a local run shows.
    retry: 1,
  },
});