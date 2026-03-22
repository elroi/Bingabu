import { describe, it, expect } from "vitest";
import {
  POINTS_PER_LINE,
  countBingoLines,
  getFirstBingoDrawIndex,
  rankParticipantsForStandings,
} from "./bingoScoring.js";

/** Minimal 5×5 card: row 0 is 1–5, row 1 is 6–10, center FREE, other cells unique. */
function cardRowTopBingo() {
  return [
    [1, 2, 3, 4, 5],
    [16, 17, 18, 19, 20],
    [31, 32, "FREE", 34, 35],
    [46, 47, 48, 49, 50],
    [61, 62, 63, 64, 65],
  ];
}

function cardSecondRowBingo() {
  return [
    [11, 12, 13, 14, 15],
    [6, 7, 8, 9, 10],
    [31, 32, "FREE", 34, 35],
    [46, 47, 48, 49, 50],
    [61, 62, 63, 64, 65],
  ];
}

describe("bingoScoring", () => {
  it("POINTS_PER_LINE is 10", () => {
    expect(POINTS_PER_LINE).toBe(10);
  });

  it("countBingoLines is 0 when nothing drawn", () => {
    const card = cardRowTopBingo();
    expect(countBingoLines(card, new Set())).toBe(0);
  });

  it("countBingoLines counts one row when that row is fully drawn", () => {
    const card = cardRowTopBingo();
    const drawn = new Set([1, 2, 3, 4, 5]);
    expect(countBingoLines(card, drawn)).toBe(1);
  });

  it("getFirstBingoDrawIndex returns 1-based index of first draw that yields a line", () => {
    const card = cardRowTopBingo();
    const seq = [1, 2, 3, 4, 5];
    expect(getFirstBingoDrawIndex(card, seq)).toBe(5);
  });

  it("getFirstBingoDrawIndex returns Infinity when no line ever completes", () => {
    const card = cardRowTopBingo();
    expect(getFirstBingoDrawIndex(card, [1, 2, 3])).toBe(Infinity);
  });

  it("rankParticipantsForStandings uses defaultName when name is empty", () => {
    const card = cardRowTopBingo();
    const ranked = rankParticipantsForStandings({
      participantCards: [card],
      participantNames: ["  "],
      drawnSequence: [1, 2, 3, 4, 5],
      defaultName: (i) => `Slot${i + 1}`,
    });
    expect(ranked).toHaveLength(1);
    expect(ranked[0].name).toBe("Slot1");
    expect(ranked[0].points).toBe(10);
    expect(ranked[0].rank).toBe(1);
  });

  it("rankParticipantsForStandings breaks ties by earlier first bingo", () => {
    const a = cardRowTopBingo();
    const b = cardSecondRowBingo();
    const seq = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const ranked = rankParticipantsForStandings({
      participantCards: [a, b],
      participantNames: ["Amy", "Ben"],
      drawnSequence: seq,
      defaultName: () => "?",
    });
    expect(ranked[0].name).toBe("Amy");
    expect(ranked[1].name).toBe("Ben");
    expect(ranked[0].points).toBe(10);
    expect(ranked[1].points).toBe(10);
    expect(ranked[0].firstBingoAt).toBe(5);
    expect(ranked[1].firstBingoAt).toBe(10);
  });
});
