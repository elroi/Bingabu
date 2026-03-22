import { describe, it, expect } from "vitest";
import { generateOneCard } from "./cardGenerator.js";

/** Deterministic PRNG: same sequence every run. */
function makeRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

function columnRange(col) {
  const start = col * 15 + 1;
  return { start, end: start + 14 };
}

function assertNumbersInColumnRanges(card) {
  const rows = card.length;
  const cols = card[0].length;
  for (let c = 0; c < cols; c++) {
    const { start, end } = columnRange(c);
    for (let r = 0; r < rows; r++) {
      const v = card[r][c];
      if (v === "FREE") continue;
      expect(typeof v).toBe("number");
      expect(v).toBeGreaterThanOrEqual(start);
      expect(v).toBeLessThanOrEqual(end);
    }
  }
}

describe("cardGenerator", () => {
  it("5×5 matches classic layout: center FREE, N column has four numbers", () => {
    const rng = makeRng(42);
    const card = generateOneCard({}, 5, 5, rng);
    expect(card).toHaveLength(5);
    expect(card[0]).toHaveLength(5);
    expect(card[2][2]).toBe("FREE");
    const nCol = [card[0][2], card[1][2], card[2][2], card[3][2], card[4][2]].filter((x) => x !== "FREE");
    expect(nCol).toHaveLength(4);
    assertNumbersInColumnRanges(card);
    for (let c = 0; c < 5; c++) {
      const nums = [];
      for (let r = 0; r < 5; r++) {
        const v = card[r][c];
        if (typeof v === "number") nums.push(v);
      }
      expect(new Set(nums).size).toBe(nums.length);
    }
  });

  it("4×4 has no FREE and sixteen numbers", () => {
    const rng = makeRng(99);
    const card = generateOneCard({}, 4, 4, rng);
    expect(card).toHaveLength(4);
    let nums = 0;
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        expect(card[r][c]).not.toBe("FREE");
        nums++;
      }
    }
    expect(nums).toBe(16);
    assertNumbersInColumnRanges(card);
  });

  it("3×3 has center FREE and eight numbers", () => {
    const rng = makeRng(7);
    const card = generateOneCard({}, 3, 3, rng);
    expect(card[1][1]).toBe("FREE");
    let numCount = 0;
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        if (card[r][c] !== "FREE") numCount++;
      }
    }
    expect(numCount).toBe(8);
    assertNumbersInColumnRanges(card);
  });

  it("respects exclude within column ranges", () => {
    const rng = makeRng(1);
    const card = generateOneCard({ exclude: [1, 16, 31] }, 3, 3, rng);
    const flat = card.flat();
    expect(flat.includes(1)).toBe(false);
    expect(flat.includes(16)).toBe(false);
    expect(flat.includes(31)).toBe(false);
  });
});
