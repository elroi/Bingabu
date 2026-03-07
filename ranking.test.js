import { describe, it, expect } from "vitest";
import { getOrdinal, getRankedPlayers, getRankingPhrase } from "./ranking.js";

describe("getOrdinal", () => {
  it("returns 1st, 2nd, 3rd for 1–3", () => {
    expect(getOrdinal(1)).toBe("1st");
    expect(getOrdinal(2)).toBe("2nd");
    expect(getOrdinal(3)).toBe("3rd");
  });

  it("returns 4th, 5th, 9th for 4–9", () => {
    expect(getOrdinal(4)).toBe("4th");
    expect(getOrdinal(5)).toBe("5th");
    expect(getOrdinal(9)).toBe("9th");
  });

  it("handles 11, 12, 13 as th", () => {
    expect(getOrdinal(11)).toBe("11th");
    expect(getOrdinal(12)).toBe("12th");
    expect(getOrdinal(13)).toBe("13th");
  });

  it("handles 21, 22, 23 correctly", () => {
    expect(getOrdinal(21)).toBe("21st");
    expect(getOrdinal(22)).toBe("22nd");
    expect(getOrdinal(23)).toBe("23rd");
  });
});

describe("getRankedPlayers", () => {
  it("returns empty array for empty input", () => {
    expect(getRankedPlayers([])).toEqual([]);
  });

  it("sorts by points descending, then firstBingoAt ascending", () => {
    const players = [
      { name: "A", points: 10, firstBingoAt: 20 },
      { name: "B", points: 20, firstBingoAt: 10 },
      { name: "C", points: 10, firstBingoAt: 5 },
    ];
    const ranked = getRankedPlayers(players);
    expect(ranked.map((p) => p.name)).toEqual(["B", "C", "A"]);
    expect(ranked.map((p) => p.rank)).toEqual([1, 2, 3]);
  });

  it("assigns rank 1-based", () => {
    const players = [
      { name: "X", points: 30, firstBingoAt: 1 },
      { name: "Y", points: 20, firstBingoAt: 2 },
      { name: "Z", points: 10, firstBingoAt: 3 },
    ];
    const ranked = getRankedPlayers(players);
    expect(ranked[0].rank).toBe(1);
    expect(ranked[1].rank).toBe(2);
    expect(ranked[2].rank).toBe(3);
  });
});

describe("getRankingPhrase", () => {
  it("returns empty string when currRanked is empty", () => {
    expect(getRankingPhrase([], [], {})).toBe("");
    expect(getRankingPhrase([{ name: "A", rank: 1 }], [], {})).toBe("");
  });

  it("returns empty string when no one has points (currRanked empty) - covered above", () => {});

  it("on new leader, returns a phrase like 'New leader: Alice!'", () => {
    const prev = [{ name: "Bob", rank: 1 }, { name: "Alice", rank: 2 }];
    const curr = [{ name: "Alice", rank: 1 }, { name: "Bob", rank: 2 }];
    const phrase = getRankingPhrase(prev, curr, {});
    expect(phrase).toMatch(/new leader/i);
    expect(phrase).toMatch(/alice/i);
  });

  it("on move into 2nd (no new leader), returns phrase like 'Bob moves into 2nd!'", () => {
    const prev = [{ name: "Alice", rank: 1 }, { name: "Carol", rank: 2 }, { name: "Bob", rank: 3 }];
    const curr = [{ name: "Alice", rank: 1 }, { name: "Bob", rank: 2 }, { name: "Carol", rank: 3 }];
    const phrase = getRankingPhrase(prev, curr, {});
    expect(phrase).toMatch(/moves? into 2nd|in 2nd/i);
    expect(phrase).toMatch(/bob/i);
  });

  it("on ranking change prefers new leader over other movers", () => {
    const prev = [{ name: "A", rank: 1 }, { name: "B", rank: 2 }, { name: "C", rank: 3 }];
    const curr = [{ name: "C", rank: 1 }, { name: "A", rank: 2 }, { name: "B", rank: 3 }];
    const phrase = getRankingPhrase(prev, curr, {});
    expect(phrase).toMatch(/new leader/i);
    expect(phrase).toMatch(/C/i);
  });

  it("when no ranking change and random < 0.2, returns occasional standings phrase", () => {
    const curr = [
      { name: "Alice", rank: 1 },
      { name: "Bob", rank: 2 },
      { name: "Carol", rank: 3 },
    ];
    const random = () => 0.1;
    const phrase = getRankingPhrase(curr, curr, { random });
    expect(phrase).toMatch(/1st.*alice|alice.*1st/i);
    expect(phrase).toMatch(/2nd.*bob|bob.*2nd/i);
    expect(phrase).toMatch(/3rd.*carol|carol.*3rd/i);
  });

  it("when no ranking change and random >= 0.2, returns empty string", () => {
    const curr = [{ name: "Alice", rank: 1 }, { name: "Bob", rank: 2 }];
    const random = () => 0.5;
    expect(getRankingPhrase(curr, curr, { random })).toBe("");
  });

  it("when prevRanked empty but currRanked has players (first draw), no change reported", () => {
    const curr = [{ name: "Alice", rank: 1 }];
    const phrase = getRankingPhrase([], curr, {});
    expect(phrase).toBe("");
  });
});
