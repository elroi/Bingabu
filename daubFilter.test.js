import { describe, it, expect } from "vitest";
import { filterAllowedDaubs } from "./api/_lib/daubFilter.js";

describe("filterAllowedDaubs", () => {
  const card = [
    [1, 16, 31, 46, 61],
    [2, 17, 32, 47, 62],
    [3, 18, "FREE", 48, 63],
    [4, 19, 34, 49, 64],
    [5, 20, 35, 50, 65],
  ];

  it("allows FREE center and drawn numbers only", () => {
    const state = {
      drawnSequence: [1, 18],
      participantCards: [card],
    };
    const out = filterAllowedDaubs(state, 0, ["2,2", "0,0", "99,99", "0,1"]);
    expect(out.sort()).toEqual(["0,0", "2,2"].sort());
  });

  it("returns empty for invalid slot", () => {
    const state = { drawnSequence: [], participantCards: [card] };
    expect(filterAllowedDaubs(state, 99, ["2,2"])).toEqual([]);
  });

  it("supports 4×4 cards", () => {
    const small = [
      [1, 16, 31, 46],
      [2, 17, 32, 47],
      [3, 18, 33, 48],
      [4, 19, 34, 49],
    ];
    const state = { drawnSequence: [1], participantCards: [small] };
    expect(filterAllowedDaubs(state, 0, ["0,0", "3,3", "9,9"])).toEqual(["0,0"]);
  });
});
