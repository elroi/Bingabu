import { describe, it, expect } from "vitest";
import { filterAllowedDaubs, mergeParticipantDaubsForPatch } from "./api/_lib/daubFilter.js";

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

  it("manualDaubOnly: keeps marks for numbers not yet drawn (player explicit daubs)", () => {
    const state = {
      drawnSequence: [],
      manualDaubOnly: true,
      participantCards: [card],
    };
    const keys = ["0,0", "0,1", "1,0", "4,4"];
    expect(filterAllowedDaubs(state, 0, keys).sort()).toEqual(keys.sort());
  });

  it("manualDaubOnly: still rejects keys off the card", () => {
    const state = {
      drawnSequence: [],
      manualDaubOnly: true,
      participantCards: [card],
    };
    expect(filterAllowedDaubs(state, 0, ["0,0", "99,99", "-1,0"]).sort()).toEqual(["0,0"]);
  });

  const manualState = (cards) => ({
    numParticipants: cards.length,
    participantCards: cards,
    drawnSequence: [],
    manualDaubOnly: true,
  });

  it("mergeParticipantDaubsForPatch: remote player slot keeps server daubs if host sends fewer", () => {
    const incoming = {
      ...manualState([card]),
      participantDaubs: { 0: ["0,0"] },
    };
    const room = { hostId: "host-abc", claims: { 0: "player-device-xyz" } };
    const prev = { 0: ["0,0", "1,1", "2,2"] };
    const out = mergeParticipantDaubsForPatch(prev, incoming, room);
    expect(out[0].sort()).toEqual(["0,0", "1,1", "2,2"].sort());
  });

  it("mergeParticipantDaubsForPatch: unclaimed slot uses host payload only", () => {
    const incoming = {
      ...manualState([card]),
      participantDaubs: { 0: [] },
    };
    const room = { hostId: "host-abc", claims: {} };
    const prev = { 0: ["0,0", "4,4"] };
    const out = mergeParticipantDaubsForPatch(prev, incoming, room);
    expect(out[0]).toEqual([]);
  });

  it("mergeParticipantDaubsForPatch: host-claimed slot unions server and host keys", () => {
    const incoming = {
      ...manualState([card]),
      participantDaubs: { 0: ["0,0", "4,4"] },
    };
    const room = { hostId: "host-abc", claims: { 0: "host-abc" } };
    const prev = { 0: ["1,1"] };
    const out = mergeParticipantDaubsForPatch(prev, incoming, room);
    expect(out[0].sort()).toEqual(["0,0", "1,1", "4,4"].sort());
  });
});
