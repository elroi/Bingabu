import { describe, it, expect } from "vitest";
import {
  resolveDisplay,
  normalizeKeySetId,
  NUMBERS_KEY_SET_ID,
  EN_WORDS_BEGINNER_ID,
  ICONS_KIDS_V1_ID,
  normalizeDisplayKeySetBySlot,
  getEffectiveKeySetIdForSlot,
  getMappingRowsForBall,
  allParticipantsSameDisplayForBall,
  validateKeySetEntries,
} from "./keysets.js";
import enWordsBeginner from "./keysets/en-words-beginner.json";
import iconsKidsV1 from "./keysets/icons-kids-v1.json";

describe("key set JSON assets", () => {
  it("has 75 valid entries each", () => {
    expect(() => validateKeySetEntries(enWordsBeginner)).not.toThrow();
    expect(() => validateKeySetEntries(iconsKidsV1)).not.toThrow();
  });

  it("uses distinct display text per ball for words", () => {
    const texts = new Set();
    for (let i = 1; i <= 75; i++) {
      texts.add(enWordsBeginner[String(i)].text);
    }
    expect(texts.size).toBe(75);
  });
});

describe("normalizeKeySetId", () => {
  it("falls back to numbers for unknown", () => {
    expect(normalizeKeySetId("nope")).toBe(NUMBERS_KEY_SET_ID);
    expect(normalizeKeySetId(null)).toBe(NUMBERS_KEY_SET_ID);
  });
});

describe("resolveDisplay", () => {
  it("numbers mode uses string ball id", () => {
    expect(resolveDisplay(42, NUMBERS_KEY_SET_ID)).toEqual({
      text: "42",
      speech: "42",
      image: null,
    });
  });

  it("words mode maps ball 1 to cat", () => {
    const d = resolveDisplay(1, EN_WORDS_BEGINNER_ID);
    expect(d.text).toBe("cat");
    expect(d.speech).toBe("cat");
  });

  it("icons mode maps ball 1 to dog speech", () => {
    const d = resolveDisplay(1, ICONS_KIDS_V1_ID);
    expect(d.speech).toBe("dog");
    expect(d.text.length).toBeGreaterThan(0);
  });
});

describe("per-slot key sets", () => {
  it("normalizes bySlot length to numParticipants", () => {
    expect(normalizeDisplayKeySetBySlot(ICONS_KIDS_V1_ID, ["bad"], 2)).toEqual([
      NUMBERS_KEY_SET_ID,
      ICONS_KIDS_V1_ID,
    ]);
  });

  it("getEffectiveKeySetIdForSlot reads bySlot", () => {
    const state = {
      displayKeySetId: NUMBERS_KEY_SET_ID,
      displayKeySetBySlot: [EN_WORDS_BEGINNER_ID, ICONS_KIDS_V1_ID],
      numParticipants: 2,
    };
    expect(getEffectiveKeySetIdForSlot(state, 0)).toBe(EN_WORDS_BEGINNER_ID);
    expect(getEffectiveKeySetIdForSlot(state, 1)).toBe(ICONS_KIDS_V1_ID);
  });

  it("getMappingRowsForBall lists each player label", () => {
    const state = {
      displayKeySetId: NUMBERS_KEY_SET_ID,
      displayKeySetBySlot: [NUMBERS_KEY_SET_ID, EN_WORDS_BEGINNER_ID],
      numParticipants: 2,
      participantNames: ["Ann", "Ben"],
    };
    const { canonical, rows } = getMappingRowsForBall(state, 1);
    expect(canonical).toBe("B-1");
    expect(rows[0].label).toBe("1");
    expect(rows[1].label).toBe("cat");
  });

  it("getMappingRowsForBall uses defaultNameForSlot when names empty", () => {
    const state = {
      displayKeySetId: NUMBERS_KEY_SET_ID,
      displayKeySetBySlot: [],
      numParticipants: 2,
      participantNames: ["", "  "],
    };
    const { rows } = getMappingRowsForBall(state, 5, {
      defaultNameForSlot: (i) => `P${i + 1}`,
    });
    expect(rows[0].name).toBe("P1");
    expect(rows[1].name).toBe("P2");
  });

  it("allParticipantsSameDisplayForBall is true when every slot shows the same text", () => {
    const state = {
      displayKeySetId: NUMBERS_KEY_SET_ID,
      displayKeySetBySlot: [NUMBERS_KEY_SET_ID, NUMBERS_KEY_SET_ID],
      numParticipants: 2,
    };
    expect(allParticipantsSameDisplayForBall(state, 32)).toBe(true);
  });

  it("allParticipantsSameDisplayForBall is false when labels differ", () => {
    const state = {
      displayKeySetId: NUMBERS_KEY_SET_ID,
      displayKeySetBySlot: [NUMBERS_KEY_SET_ID, EN_WORDS_BEGINNER_ID],
      numParticipants: 2,
    };
    expect(allParticipantsSameDisplayForBall(state, 1)).toBe(false);
  });

  it("allParticipantsSameDisplayForBall is true for a single participant", () => {
    const state = {
      displayKeySetId: NUMBERS_KEY_SET_ID,
      displayKeySetBySlot: [EN_WORDS_BEGINNER_ID],
      numParticipants: 1,
    };
    expect(allParticipantsSameDisplayForBall(state, 1)).toBe(true);
  });
});
