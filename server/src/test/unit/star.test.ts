import { describe, it, expect } from "vitest";
import { getStarFromTeamSize } from "../../services/rank.service.js";

/**
 * Pure-function test for the team-size → star ladder (3^n). Star N requires a
 * team of 3^N (3,9,27,…,59049); below 3 is star 0, and the ladder caps at 10.
 * No DB needed — getStarFromTeamSize is a pure function.
 */
describe("getStarFromTeamSize", () => {
  it("returns 0 below the first threshold (3)", () => {
    expect(getStarFromTeamSize(0)).toBe(0);
    expect(getStarFromTeamSize(1)).toBe(0);
    expect(getStarFromTeamSize(2)).toBe(0);
  });

  it("returns 1 at exactly 3", () => {
    expect(getStarFromTeamSize(3)).toBe(1);
  });

  it("returns 2 at 9 and stays 1 just below it", () => {
    expect(getStarFromTeamSize(8)).toBe(1);
    expect(getStarFromTeamSize(9)).toBe(2);
  });

  it("climbs the 3^n ladder", () => {
    expect(getStarFromTeamSize(27)).toBe(3);
    expect(getStarFromTeamSize(81)).toBe(4);
    expect(getStarFromTeamSize(243)).toBe(5);
    expect(getStarFromTeamSize(729)).toBe(6);
    expect(getStarFromTeamSize(2187)).toBe(7);
    expect(getStarFromTeamSize(6561)).toBe(8);
    expect(getStarFromTeamSize(19683)).toBe(9);
  });

  it("returns 10 at 59049 and caps above it", () => {
    expect(getStarFromTeamSize(59049)).toBe(10);
    expect(getStarFromTeamSize(100000)).toBe(10);
    expect(getStarFromTeamSize(1_000_000)).toBe(10);
  });
});