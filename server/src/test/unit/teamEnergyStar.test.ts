import { describe, it, expect } from "vitest";
import {
  STAR_REQUIREMENTS,
  STAR_PCT_TABLE,
  computeEnergyStar,
  bpFromPct,
  calcTeamEnergyBonusCents,
} from "../../services/teamEnergy.service.js";

/**
 * Pure-function tests for the Daily Team Energy star table + payout math.
 * No DB needed — computeEnergyStar / calcTeamEnergyBonusCents are pure.
 */
describe("STAR_REQUIREMENTS / STAR_PCT_TABLE", () => {
  it("matches the spec table (3^N members, spec percentages)", () => {
    expect(STAR_REQUIREMENTS).toEqual([0, 3, 9, 27, 81, 243, 729, 2187, 6561, 19683, 59049]);
    expect(STAR_PCT_TABLE).toEqual([10, 5, 4, 3, 2, 1, 0.5, 0.5, 0.25, 0.25]);
  });
});

describe("computeEnergyStar (sequential, per-level)", () => {
  const map = (entries: [number, number][]): Map<number, number> => new Map(entries);

  it("0–2 active members at level 1 → no star", () => {
    expect(computeEnergyStar(map([]))).toBe(0);
    expect(computeEnergyStar(map([[1, 0]]))).toBe(0);
    expect(computeEnergyStar(map([[1, 2]]))).toBe(0);
  });

  it("each level boundary flips exactly at 3^N members at that level", () => {
    // for each star S: lower levels fully satisfied, level S exactly one
    // member short → star S−1; level S at requirement → star S
    for (let star = 1; star <= 10; star++) {
      const counts = new Map<number, number>();
      for (let level = 1; level < star; level++) counts.set(level, STAR_REQUIREMENTS[level]);
      counts.set(star, STAR_REQUIREMENTS[star] - 1); // boundary − 1
      expect(computeEnergyStar(counts)).toBe(star - 1);
      counts.set(star, STAR_REQUIREMENTS[star]); // boundary
      expect(computeEnergyStar(counts)).toBe(star);
    }
  });

  it("is sequential — a deep downline cannot bypass an incomplete level 1", () => {
    // 100 active members at level 2, only 2 at level 1 → star 0
    expect(computeEnergyStar(map([[2, 100]]))).toBe(0);
    // level 1 passes, level 2 just short → star 1
    expect(computeEnergyStar(map([[1, 3], [2, 8]]))).toBe(1);
    // level 1 passes, level 2 passes, level 3 short → star 2
    expect(computeEnergyStar(map([[1, 3], [2, 9], [3, 26]]))).toBe(2);
  });

  it("respects the maxStar cap (e.g. admin depth knob)", () => {
    const full = map([[1, 3], [2, 9], [3, 27], [4, 81], [5, 243], [6, 729], [7, 2187], [8, 6561], [9, 19683], [10, 59049]]);
    expect(computeEnergyStar(full)).toBe(10);
    expect(computeEnergyStar(full, 3)).toBe(3);
    expect(computeEnergyStar(full, 0)).toBe(0);
  });
});

describe("bpFromPct", () => {
  it("converts percentages to basis points integer-exactly", () => {
    expect(bpFromPct(10)).toBe(1000);
    expect(bpFromPct(5)).toBe(500);
    expect(bpFromPct(0.5)).toBe(50);
    expect(bpFromPct(0.25)).toBe(25);
  });
});

describe("calcTeamEnergyBonusCents", () => {
  it("applies the star percentage in integer cents", () => {
    // $100 base × 4% = $4
    expect(calcTeamEnergyBonusCents(10000, bpFromPct(4))).toBe(400);
    // $500 base × 4% = $20
    expect(calcTeamEnergyBonusCents(50000, bpFromPct(4))).toBe(2000);
    // $1000 base × 0.5% = $5
    expect(calcTeamEnergyBonusCents(100000, bpFromPct(0.5))).toBe(500);
  });

  it("rounds to the nearest cent without float drift", () => {
    // 1333¢ × 0.5% (50bp) = 6.665¢ → 7
    expect(calcTeamEnergyBonusCents(1333, 50)).toBe(7);
    // 1337¢ × 0.25% (25bp) = 3.3425¢ → 3
    expect(calcTeamEnergyBonusCents(1337, 25)).toBe(3);
    // 337¢ × 25bp = 0.8425¢ → 1
    expect(calcTeamEnergyBonusCents(337, 25)).toBe(1);
  });

  it("returns 0 for zero base or zero rate", () => {
    expect(calcTeamEnergyBonusCents(0, 1000)).toBe(0);
    expect(calcTeamEnergyBonusCents(10000, 0)).toBe(0);
  });
});