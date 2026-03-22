import { describe, it, expect } from "vitest";
import { resolveStandingsUiState } from "./playerStandingsLatch.js";

const emptyPrev = { lastRanked: null, snapGid: null, snapFp: "" };

describe("resolveStandingsUiState", () => {
  it("hides when no points and no snapshot", () => {
    const ranked = [{ name: "A", points: 0, rank: 1, firstBingoAt: Infinity, index: 0 }];
    const out = resolveStandingsUiState(emptyPrev, {
      ranked,
      gameInstanceId: null,
      cardFingerprint: "fp1",
    });
    expect(out.show).toBe(false);
    expect(out.rankedForUi).toEqual(ranked);
  });

  it("shows when someone has points and stores snapshot", () => {
    const ranked = [{ name: "A", points: 10, rank: 1, firstBingoAt: 3, index: 0 }];
    const out = resolveStandingsUiState(emptyPrev, {
      ranked,
      gameInstanceId: 1,
      cardFingerprint: "fp1",
    });
    expect(out.show).toBe(true);
    expect(out.rankedForUi).toEqual(ranked);
    expect(out.prev.lastRanked).toEqual(ranked);
    expect(out.prev.snapGid).toBe(1);
    expect(out.prev.snapFp).toBe("fp1");
  });

  it("keeps showing last snapshot when current ranked has zero points (transient)", () => {
    const good = [{ name: "A", points: 10, rank: 1, firstBingoAt: 3, index: 0 }];
    const afterShow = resolveStandingsUiState(emptyPrev, {
      ranked: good,
      gameInstanceId: 1,
      cardFingerprint: "fp1",
    });
    const stale = [{ name: "A", points: 0, rank: 1, firstBingoAt: Infinity, index: 0 }];
    const out = resolveStandingsUiState(afterShow.prev, {
      ranked: stale,
      gameInstanceId: 1,
      cardFingerprint: "fp1",
    });
    expect(out.show).toBe(true);
    expect(out.rankedForUi).toEqual(good);
    expect(out.prev.lastRanked).toEqual(good);
  });

  it("clears snapshot when gameInstanceId changes", () => {
    const good = [{ name: "A", points: 10, rank: 1, firstBingoAt: 3, index: 0 }];
    const afterShow = resolveStandingsUiState(emptyPrev, {
      ranked: good,
      gameInstanceId: 1,
      cardFingerprint: "fp1",
    });
    const zero = [{ name: "A", points: 0, rank: 1, firstBingoAt: Infinity, index: 0 }];
    const out = resolveStandingsUiState(afterShow.prev, {
      ranked: zero,
      gameInstanceId: 2,
      cardFingerprint: "fp1",
    });
    expect(out.show).toBe(false);
    expect(out.rankedForUi).toEqual(zero);
    expect(out.prev.lastRanked).toBe(null);
  });

  it("clears snapshot when card fingerprint changes (same game id)", () => {
    const good = [{ name: "A", points: 10, rank: 1, firstBingoAt: 3, index: 0 }];
    const afterShow = resolveStandingsUiState(emptyPrev, {
      ranked: good,
      gameInstanceId: 1,
      cardFingerprint: "fp1",
    });
    const zero = [{ name: "A", points: 0, rank: 1, firstBingoAt: Infinity, index: 0 }];
    const out = resolveStandingsUiState(afterShow.prev, {
      ranked: zero,
      gameInstanceId: 1,
      cardFingerprint: "fp2",
    });
    expect(out.show).toBe(false);
    expect(out.prev.lastRanked).toBe(null);
  });
});
