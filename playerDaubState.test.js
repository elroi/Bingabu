import { describe, it, expect } from "vitest";
import { cardFingerprint, syncPlayerDaubs, normalizeGameInstanceId } from "./playerDaubState.js";

const sampleCard = [
  [1, 16, 31, 46, 61],
  [2, 17, 32, 47, 62],
  [3, 18, "FREE", 48, 63],
  [4, 19, 34, 49, 64],
  [5, 20, 35, 50, 65],
];

const otherCard = [
  [10, 16, 31, 46, 61],
  [2, 17, 32, 47, 62],
  [3, 18, "FREE", 48, 63],
  [4, 19, 34, 49, 64],
  [5, 20, 35, 50, 65],
];

const card4x4 = [
  [1, 16, 31, 46],
  [2, 17, 32, 47],
  [3, 18, 33, 48],
  [4, 19, 34, 49],
];

describe("playerDaubState", () => {
  it("normalizeGameInstanceId accepts non-negative finite numbers only", () => {
    expect(normalizeGameInstanceId(0)).toBe(0);
    expect(normalizeGameInstanceId(42)).toBe(42);
    expect(normalizeGameInstanceId(-1)).toBe(null);
    expect(normalizeGameInstanceId(NaN)).toBe(null);
    expect(normalizeGameInstanceId("3")).toBe(null);
    expect(normalizeGameInstanceId(null)).toBe(null);
  });

  it("cardFingerprint changes when grid values change", () => {
    expect(cardFingerprint(sampleCard)).not.toBe(cardFingerprint(otherCard));
    expect(cardFingerprint(sampleCard)).toBe(cardFingerprint(JSON.parse(JSON.stringify(sampleCard))));
  });

  it("uses server participantDaubs when present for the slot", () => {
    const { daubs, cardFingerprint: fp } = syncPlayerDaubs({
      card: sampleCard,
      slotIndex: 1,
      participantDaubs: { "1": ["0,0", "2,2"] },
      localDaubsBefore: new Set(["4,4"]),
      storedCardFingerprint: "",
    });
    expect([...daubs].sort()).toEqual(["0,0", "2,2"]);
    expect(fp).toBe(cardFingerprint(sampleCard));
  });

  it("clears local daubs when card fingerprint changed and server omits slot", () => {
    const oldFp = cardFingerprint(sampleCard);
    const { daubs, cardFingerprint: fp } = syncPlayerDaubs({
      card: otherCard,
      slotIndex: 0,
      participantDaubs: {},
      localDaubsBefore: new Set(["0,0", "1,1"]),
      storedCardFingerprint: oldFp,
    });
    expect(daubs.size).toBe(0);
    expect(fp).toBe(cardFingerprint(otherCard));
  });

  it("keeps local daubs when card unchanged and server omits slot", () => {
    const fp0 = cardFingerprint(sampleCard);
    const { daubs, cardFingerprint: fp } = syncPlayerDaubs({
      card: sampleCard,
      slotIndex: 0,
      participantDaubs: {},
      localDaubsBefore: new Set(["0,0"]),
      storedCardFingerprint: fp0,
    });
    expect(daubs.has("0,0")).toBe(true);
    expect(fp).toBe(fp0);
  });

  it("drops invalid daub keys", () => {
    const { daubs } = syncPlayerDaubs({
      card: sampleCard,
      slotIndex: 0,
      participantDaubs: { "0": ["0,0", "99,99", "not-a-key"] },
      localDaubsBefore: new Set(),
      storedCardFingerprint: cardFingerprint(sampleCard),
    });
    expect([...daubs]).toEqual(["0,0"]);
  });

  it("accepts daubs on 4×4 cards", () => {
    const fp0 = cardFingerprint(card4x4);
    const { daubs } = syncPlayerDaubs({
      card: card4x4,
      slotIndex: 0,
      participantDaubs: { "0": ["3,3", "4,4"] },
      localDaubsBefore: new Set(),
      storedCardFingerprint: fp0,
    });
    expect([...daubs].sort()).toEqual(["3,3"].sort());
  });

  it("when game instance bumps, ignores stale local daubs if server omits slot", () => {
    const fp0 = cardFingerprint(sampleCard);
    const { daubs } = syncPlayerDaubs({
      card: sampleCard,
      slotIndex: 0,
      participantDaubs: {},
      localDaubsBefore: new Set(["0,0", "1,1"]),
      storedCardFingerprint: fp0,
      gameInstanceId: 2,
      storedGameInstanceId: 1,
    });
    expect(daubs.size).toBe(0);
  });

  it("when game instance bumps, uses server daubs for the slot", () => {
    const fp0 = cardFingerprint(sampleCard);
    const { daubs } = syncPlayerDaubs({
      card: sampleCard,
      slotIndex: 0,
      participantDaubs: { "0": ["2,2"] },
      localDaubsBefore: new Set(["0,0"]),
      storedCardFingerprint: fp0,
      gameInstanceId: 3,
      storedGameInstanceId: 2,
    });
    expect([...daubs]).toEqual(["2,2"]);
  });

  it("first visit (no stored instance) still applies fingerprint vs local", () => {
    const oldFp = cardFingerprint(sampleCard);
    const { daubs } = syncPlayerDaubs({
      card: otherCard,
      slotIndex: 0,
      participantDaubs: {},
      localDaubsBefore: new Set(["0,0"]),
      storedCardFingerprint: oldFp,
      gameInstanceId: 1,
      storedGameInstanceId: null,
    });
    expect(daubs.size).toBe(0);
  });

  it("manualDaubMergeLocal keeps local extras when server list is a strict subset (stale GET)", () => {
    const fp0 = cardFingerprint(sampleCard);
    const { daubs } = syncPlayerDaubs({
      card: sampleCard,
      slotIndex: 0,
      participantDaubs: { "0": ["0,0", "1,1"] },
      localDaubsBefore: new Set(["0,0", "1,1", "2,2"]),
      storedCardFingerprint: fp0,
      gameInstanceId: 1,
      storedGameInstanceId: 1,
      manualDaubMergeLocal: true,
    });
    expect([...daubs].sort()).toEqual(["0,0", "1,1", "2,2"].sort());
  });

  it("manualDaubMergeLocal keeps local when server is empty but local has daubs", () => {
    const fp0 = cardFingerprint(sampleCard);
    const { daubs } = syncPlayerDaubs({
      card: sampleCard,
      slotIndex: 0,
      participantDaubs: { "0": [] },
      localDaubsBefore: new Set(["0,0"]),
      storedCardFingerprint: fp0,
      gameInstanceId: 1,
      storedGameInstanceId: 1,
      manualDaubMergeLocal: true,
    });
    expect([...daubs]).toEqual(["0,0"]);
  });

  it("manualDaubMergeLocal prefers leaner local when local is subset of server (undo + fat stale GET)", () => {
    const fp0 = cardFingerprint(sampleCard);
    const { daubs } = syncPlayerDaubs({
      card: sampleCard,
      slotIndex: 0,
      participantDaubs: { "0": ["0,0", "1,1", "2,2"] },
      localDaubsBefore: new Set(["0,0", "1,1"]),
      storedCardFingerprint: fp0,
      gameInstanceId: 1,
      storedGameInstanceId: 1,
      manualDaubMergeLocal: true,
    });
    expect([...daubs].sort()).toEqual(["0,0", "1,1"].sort());
  });

  it("manualDaubMergeLocal false keeps server-only when server and local disagree", () => {
    const fp0 = cardFingerprint(sampleCard);
    const { daubs } = syncPlayerDaubs({
      card: sampleCard,
      slotIndex: 0,
      participantDaubs: { "0": ["0,0", "2,2"] },
      localDaubsBefore: new Set(["1,1"]),
      storedCardFingerprint: fp0,
      gameInstanceId: 1,
      storedGameInstanceId: 1,
      manualDaubMergeLocal: false,
    });
    expect([...daubs].sort()).toEqual(["0,0", "2,2"].sort());
  });
});
