import { describe, it, expect, beforeEach } from "vitest";
import * as store from "./api/_lib/store.js";
import roomHandler from "./api/rooms/[roomId].js";

function mockRes() {
  const res = {
    statusCode: 200,
    body: null,
    setHeader() {},
    status(c) {
      this.statusCode = c;
      return this;
    },
    json(j) {
      this.body = j;
      return this;
    },
    end() {},
  };
  return res;
}

const baseState = {
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
  participantNames: ["A"],
  displayKeySetId: "en-words-beginner",
  displayKeySetBySlot: ["icons-kids-v1"],
};

describe("PATCH room state with display key sets", () => {
  const roomId = "PATCHKS1";
  const hostId = "cccccccc-cccc-cccc-cccc-cccccccccccc";

  beforeEach(async () => {
    await store.remove(roomId);
    await store.set(roomId, {
      roomId,
      hostId,
      state: JSON.parse(JSON.stringify({ ...baseState, displayKeySetBySlot: ["numbers"] })),
      claims: {},
      createdAt: Date.now(),
      expiresAt: null,
    });
  });

  it("accepts state with displayKeySetId and displayKeySetBySlot", async () => {
    const req = {
      method: "PATCH",
      url: `/api/rooms/${roomId}`,
      headers: { "x-host-id": hostId, "content-type": "application/json" },
      body: { state: baseState },
    };
    const res = mockRes();
    await roomHandler(req, res);
    expect(res.statusCode).toBe(200);
    const room = await store.get(roomId);
    expect(room.state.displayKeySetId).toBe("en-words-beginner");
    expect(room.state.displayKeySetBySlot).toEqual(["icons-kids-v1"]);
  });
});
