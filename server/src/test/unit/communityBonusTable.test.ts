import { describe, it, expect } from "vitest";
import {
  MAX_STAR,
  STAR_REQUIREMENTS,
  STAR_MONTHLY_BONUS_USD,
  monthlyBonusCentsForStar,
  computeQualifiedStar,
} from "../../services/starQualification.service.js";

/**
 * Pure-function tests for the Community Monthly Bonus table + the shared Star
 * Qualification Engine's sequential/mixed-level rules. No DB needed — both
 * functions are pure.
 */
describe("STAR_MONTHLY_BONUS_USD (fixed monthly $ table)", () => {
  it("matches the spec table for every star", () => {
    expect(MAX_STAR).toBe(10);
    expect(STAR_MONTHLY_BONUS_USD).toEqual([10, 20, 50, 100, 250, 500, 1000, 2000, 5000, 10000]);
    expect(STAR_REQUIREMENTS).toEqual([0, 3, 9, 27, 81, 243, 729, 2187, 6561, 19683, 59049]);
  });

  it("monthlyBonusCentsForStar converts each star's fixed amount to integer cents", () => {
    const expectedCents = [1000, 2000, 5000, 10_000, 25_000, 50_000, 100_000, 200_000, 500_000, 1_000_000];
    for (let star = 1; star <= 10; star++) {
      expect(monthlyBonusCentsForStar(star)).toBe(expectedCents[star - 1]);
    }
  });

  it("monthlyBonusCentsForStar pays nothing for an unqualified / out-of-range star", () => {
    expect(monthlyBonusCentsForStar(0)).toBe(0);
    expect(monthlyBonusCentsForStar(-1)).toBe(0);
    expect(monthlyBonusCentsForStar(11)).toBe(0);
  });

  it("is a fixed dollar amount, never a percentage — every value is a whole dollar", () => {
    for (let star = 1; star <= 10; star++) {
      expect(monthlyBonusCentsForStar(star) % 100).toBe(0);
    }
  });
});

describe("computeQualifiedStar (shared engine — sequential, per-level)", () => {
  const map = (entries: [number, number][]): Map<number, number> => new Map(entries);

  it("0–2 qualifying members at level 1 → no star ($0)", () => {
    expect(computeQualifiedStar(map([]))).toBe(0);
    expect(computeQualifiedStar(map([[1, 0]]))).toBe(0);
    expect(computeQualifiedStar(map([[1, 2]]))).toBe(0);
  });

  it("spec §2: 1 member at level 1 + 8 at level 2 (total 9) → NO star", () => {
    // Mixed levels are never summed — 1★ needs 3 AT level 1.
    expect(computeQualifiedStar(map([[1, 1], [2, 8]]))).toBe(0);
  });

  it("spec §3: 3 at level 1, level 2 short → 1 Star ($10), never 2 Star ($20)", () => {
    expect(computeQualifiedStar(map([[1, 3], [2, 8]]))).toBe(1);
  });

  it("3 at level 1 + exactly 9 at level 2 → 2 Star", () => {
    expect(computeQualifiedStar(map([[1, 3], [2, 9]]))).toBe(2);
  });

  it("3★ numerically qualified cannot bypass an incomplete 2★", () => {
    expect(computeQualifiedStar(map([[1, 3], [2, 8], [3, 27]]))).toBe(1);
    expect(computeQualifiedStar(map([[1, 3], [2, 9], [3, 26]]))).toBe(2);
    expect(computeQualifiedStar(map([[1, 3], [2, 9], [3, 27]]))).toBe(3);
  });

  it("every star boundary flips exactly at 3^N members AT that level", () => {
    // for each star S: all lower levels fully satisfied; level S exactly one
    // short → S−1; at the requirement → S (covers 2/3, 8/9, 26/27, 80/81,
    // 242/243, 728/729, 2186/2187, 6560/6561, 19682/19683, 59048/59049).
    for (let star = 1; star <= 10; star++) {
      const counts = new Map<number, number>();
      for (let level = 1; level < star; level++) counts.set(level, STAR_REQUIREMENTS[level]);
      counts.set(star, STAR_REQUIREMENTS[star] - 1);
      expect(computeQualifiedStar(counts)).toBe(star - 1);
      counts.set(star, STAR_REQUIREMENTS[star]);
      expect(computeQualifiedStar(counts)).toBe(star);
    }
  });

  it("respects the maxStar cap (used by settings-derived depth caps)", () => {
    const counts = new Map<number, number>();
    for (let level = 1; level <= 10; level++) counts.set(level, STAR_REQUIREMENTS[level]);
    expect(computeQualifiedStar(counts, 0)).toBe(0);
    expect(computeQualifiedStar(counts, 3)).toBe(3);
    expect(computeQualifiedStar(counts)).toBe(10);
  });
});