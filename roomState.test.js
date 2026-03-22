import { describe, it, expect } from "vitest";
import { isValidGameState, inferCardDimensions, DEFAULT_CARD_SIZE } from "./api/_lib/roomState.js";

const base5 = {
  drawnSequence: [],
  numParticipants: 1,
  participantCards: [
    [
      [1, 16, 31, 46, 61],
      [2, 17, 32, 47, 62],
      [3, 18, "FREE", 48, 63],
      [4, 19, 34, 49, 64],
      [5, 20, 35, 50, 65],
    ],
  ],
};

describe("roomState", () => {
  it("accepts classic 5×5 state without cardRows/cardCols", () => {
    expect(isValidGameState(base5)).toBe(true);
  });

  it("accepts 4×4 with matching cardRows/cardCols", () => {
    const card = [
      [1, 16, 31, 46],
      [2, 17, 32, 47],
      [3, 18, 33, 48],
      [4, 19, 34, 49],
    ];
    expect(
      isValidGameState({
        drawnSequence: [],
        numParticipants: 1,
        cardRows: 4,
        cardCols: 4,
        participantCards: [card],
      })
    ).toBe(true);
  });

  it("rejects wrong number in column range", () => {
    const bad = JSON.parse(JSON.stringify(base5));
    bad.participantCards[0][0][0] = 16;
    expect(isValidGameState(bad)).toBe(false);
  });

  it("rejects mismatched cardRows vs grid", () => {
    const card = base5.participantCards[0];
    expect(
      isValidGameState({
        drawnSequence: [],
        numParticipants: 1,
        cardRows: 4,
        cardCols: 4,
        participantCards: [card],
      })
    ).toBe(false);
  });

  it("rejects non-square grid", () => {
    const card = [
      [1, 16, 31],
      [2, 17, 32],
    ];
    expect(
      isValidGameState({
        drawnSequence: [],
        numParticipants: 1,
        participantCards: [card],
      })
    ).toBe(false);
  });

  it("inferCardDimensions reads first card", () => {
    expect(inferCardDimensions(base5)).toEqual({ rows: 5, cols: 5 });
  });

  it("inferCardDimensions defaults when no cards", () => {
    expect(inferCardDimensions({ participantCards: [], numParticipants: 0 })).toEqual({
      rows: DEFAULT_CARD_SIZE,
      cols: DEFAULT_CARD_SIZE,
    });
  });
});
