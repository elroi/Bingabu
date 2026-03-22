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

const roomId = "PATCHST1";
const hostId = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

const valid5 = {
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

describe("PATCH room state validation", () => {
  beforeEach(async () => {
    await store.remove(roomId);
    await store.set(roomId, {
      roomId,
      hostId,
      state: JSON.parse(JSON.stringify(valid5)),
      claims: {},
      createdAt: Date.now(),
      expiresAt: null,
    });
  });

  it("rejects invalid state body", async () => {
    const bad = JSON.parse(JSON.stringify(valid5));
    bad.participantCards[0][0][0] = 99;
    const req = {
      method: "PATCH",
      url: `/api/rooms/${roomId}`,
      headers: { "x-host-id": hostId, "content-type": "application/json" },
      body: { state: bad },
    };
    const res = mockRes();
    await roomHandler(req, res);
    expect(res.statusCode).toBe(400);
  });

  it("accepts valid 4×4 state with cardRows/cardCols", async () => {
    const card = [
      [1, 16, 31, 46],
      [2, 17, 32, 47],
      [3, 18, 33, 48],
      [4, 19, 34, 49],
    ];
    const state = {
      drawnSequence: [],
      numParticipants: 1,
      cardRows: 4,
      cardCols: 4,
      participantCards: [card],
    };
    const req = {
      method: "PATCH",
      url: `/api/rooms/${roomId}`,
      headers: { "x-host-id": hostId, "content-type": "application/json" },
      body: { state },
    };
    const res = mockRes();
    await roomHandler(req, res);
    expect(res.statusCode).toBe(200);
    const room = await store.get(roomId);
    expect(room.state.cardRows).toBe(4);
    expect(room.state.participantCards[0]).toHaveLength(4);
  });
});
