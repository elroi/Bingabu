import { describe, it, expect } from "vitest";
import {
  maxBallIdForSquareCardSize,
  fullDrawPoolForSquareCardSize,
  availableNumbersAfterDraws,
  coercedDrawnSequenceForCardSize,
  formatCurrentCallForDisplay,
} from "./cardSizeCalling.js";

describe("cardSizeCalling", () => {
  it("maxBallIdForSquareCardSize matches column count × 15", () => {
    expect(maxBallIdForSquareCardSize(3)).toBe(45);
    expect(maxBallIdForSquareCardSize(4)).toBe(60);
    expect(maxBallIdForSquareCardSize(5)).toBe(75);
    expect(maxBallIdForSquareCardSize(99)).toBe(75);
  });

  it("fullDrawPoolForSquareCardSize returns 1..max", () => {
    expect(fullDrawPoolForSquareCardSize(3)).toEqual(
      Array.from({ length: 45 }, (_, i) => i + 1)
    );
    expect(fullDrawPoolForSquareCardSize(4).length).toBe(60);
    expect(fullDrawPoolForSquareCardSize(5).length).toBe(75);
  });

  it("availableNumbersAfterDraws excludes drawn balls in range", () => {
    expect(availableNumbersAfterDraws(3, [1, 45])).toEqual(
      Array.from({ length: 43 }, (_, i) => i + 2)
    );
    expect(availableNumbersAfterDraws(4, []).length).toBe(60);
  });

  it("formatCurrentCallForDisplay uses letter prefix only for 5×5", () => {
    expect(formatCurrentCallForDisplay(12, "12", 5)).toBe("B-12");
    expect(formatCurrentCallForDisplay(12, "12", 4)).toBe("12");
    expect(formatCurrentCallForDisplay(12, "12", 3)).toBe("12");
    expect(formatCurrentCallForDisplay(61, "61", 5)).toBe("O-61");
  });

  it("coercedDrawnSequenceForCardSize filters out-of-range balls", () => {
    expect(coercedDrawnSequenceForCardSize([1, 70, 45], 3)).toEqual([1, 45]);
    expect(coercedDrawnSequenceForCardSize([60, 61], 4)).toEqual([60]);
  });
});
