// Phase 20 — client test setup. Registers @testing-library/jest-dom matchers
// (vitest entry). Tests use explicit `import { describe, it, expect } from
// "vitest"` (globals disabled) to stay compatible with the strict tsconfig.
import "@testing-library/jest-dom/vitest";