import { describe, it, expect, beforeEach } from "vitest";
import * as store from "./api/lib/store.js";
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

const state = {
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
};

describe("PATCH room joinLocked only", () => {
  const roomId = "PATCHLK1";
  const hostId = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

  beforeEach(async () => {
    await store.remove(roomId);
    await store.set(roomId, {
      roomId,
      hostId,
      state: JSON.parse(JSON.stringify(state)),
      claims: {},
      createdAt: Date.now(),
      expiresAt: null,
    });
  });

  it("sets joinLocked without sending full state", async () => {
    const req = {
      method: "PATCH",
      url: `/api/rooms/${roomId}`,
      headers: { "x-host-id": hostId, "content-type": "application/json" },
      body: { joinLocked: true },
    };
    const res = mockRes();
    await roomHandler(req, res);
    expect(res.statusCode).toBe(200);
    expect(res.body.joinLocked).toBe(true);
    const room = await store.get(roomId);
    expect(room.joinLocked).toBe(true);
    expect(room.state.numParticipants).toBe(1);
  });
});
