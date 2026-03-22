import { describe, it, expect, beforeEach } from "vitest";
import * as store from "./api/_lib/store.js";
import { handleClaim, handleBoot } from "./api/_lib/roomActionHandlers.js";

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

function makeState() {
  return {
    drawnSequence: [],
    numParticipants: 2,
    participantCards: [
      [
        [1, 16, 31, 46, 61],
        [2, 17, 32, 47, 62],
        [3, 18, "FREE", 48, 63],
        [4, 19, 34, 49, 64],
        [5, 20, 35, 50, 65],
      ],
      [
        [6, 21, 36, 51, 66],
        [7, 22, 37, 52, 67],
        [8, 23, "FREE", 53, 68],
        [9, 24, 38, 54, 69],
        [10, 25, 39, 55, 70],
      ],
    ],
    participantNames: ["A", "B"],
  };
}

describe("claim when joinLocked", () => {
  const roomId = "LOCKED1";
  const hostId = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

  beforeEach(async () => {
    await store.remove(roomId);
    await store.set(roomId, {
      roomId,
      hostId,
      joinLocked: true,
      state: makeState(),
      claims: {},
      createdAt: Date.now(),
      expiresAt: null,
    });
  });

  it("allows new device on empty slot when joinLocked", async () => {
    const req = {
      method: "POST",
      url: `/api/rooms/${roomId}/claim`,
      headers: { "content-type": "application/json" },
      body: { slotIndex: 0, deviceId: "new-device" },
    };
    const res = mockRes();
    await handleClaim(req, res, roomId);
    expect(res.statusCode).toBe(200);
  });

  it("returns 403 when joinLocked and slot already claimed by another device", async () => {
    await store.set(roomId, {
      roomId,
      hostId,
      joinLocked: true,
      state: makeState(),
      claims: { "0": "alice-device" },
      createdAt: Date.now(),
      expiresAt: null,
    });
    const req = {
      method: "POST",
      url: `/api/rooms/${roomId}/claim`,
      headers: { "content-type": "application/json" },
      body: { slotIndex: 0, deviceId: "bob-device" },
    };
    const res = mockRes();
    await handleClaim(req, res, roomId);
    expect(res.statusCode).toBe(403);
    expect(res.body.error).toMatch(/closed/i);
  });

  it("allows reclaiming empty slot after boot when joinLocked", async () => {
    await store.set(roomId, {
      roomId,
      hostId,
      joinLocked: true,
      state: makeState(),
      claims: { "0": "stuck-device" },
      createdAt: Date.now(),
      expiresAt: null,
    });
    const bootReq = {
      method: "POST",
      url: `/api/rooms/${roomId}/boot`,
      headers: { "x-host-id": hostId, "content-type": "application/json" },
      body: { slotIndex: 0 },
    };
    const bootRes = mockRes();
    await handleBoot(bootReq, bootRes, roomId);
    expect(bootRes.statusCode).toBe(200);

    const claimReq = {
      method: "POST",
      url: `/api/rooms/${roomId}/claim`,
      headers: { "content-type": "application/json" },
      body: { slotIndex: 0, deviceId: "rejoin-device" },
    };
    const claimRes = mockRes();
    await handleClaim(claimReq, claimRes, roomId);
    expect(claimRes.statusCode).toBe(200);
    const room = await store.get(roomId);
    expect(room.claims["0"]).toBe("rejoin-device");
  });

  it("allows host to claim empty slot with X-Host-Id when joinLocked", async () => {
    const req = {
      method: "POST",
      url: `/api/rooms/${roomId}/claim`,
      headers: { "x-host-id": hostId, "content-type": "application/json" },
      body: { slotIndex: 0, deviceId: hostId },
    };
    const res = mockRes();
    await handleClaim(req, res, roomId);
    expect(res.statusCode).toBe(200);
  });
});
