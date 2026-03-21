/**
 * User stories:
 * - As a host with an online room, I want to open my own player card in another tab so I can daub while calling numbers.
 * - As the system, we require X-Host-Id when using hostId as deviceId so random clients cannot impersonate the host player slot.
 * - sessionStorage is per tab; host credentials pass to the new tab via a short-lived localStorage handoff.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import * as store from "./api/lib/store.js";
import claimHandler from "./api/rooms/[roomId]/claim.js";
import daubsHandler from "./api/rooms/[roomId]/daubs.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

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

function makeCard() {
  const card = [];
  for (let r = 0; r < 5; r++) {
    const row = [];
    for (let c = 0; c < 5; c++) {
      if (r === 2 && c === 2) row.push("FREE");
      else row.push(r * 15 + c * 3 + 1);
    }
    card.push(row);
  }
  return card;
}

function validState(np = 2) {
  const participantCards = [];
  for (let i = 0; i < np; i++) participantCards.push(makeCard());
  return {
    drawnSequence: [],
    numParticipants: np,
    participantCards,
    participantNames: ["A", "B"].slice(0, np),
  };
}

describe("Host join as player: API claim", () => {
  const roomId = "HOSTJP1";
  const hostId = "11111111-1111-1111-1111-111111111111";

  beforeEach(async () => {
    await store.remove(roomId);
    await store.set(roomId, {
      roomId,
      hostId,
      state: validState(2),
      claims: {},
      createdAt: Date.now(),
      expiresAt: null,
    });
  });

  it("allows host to claim a slot using X-Host-Id and deviceId equal to hostId", async () => {
    const req = {
      method: "POST",
      url: `/api/rooms/${roomId}/claim`,
      headers: { "x-host-id": hostId },
      body: { slotIndex: 0, deviceId: hostId },
    };
    const res = mockRes();
    await claimHandler(req, res);
    expect(res.statusCode).toBe(200);
    expect(res.body.claims["0"]).toBe(hostId);
  });

  it("rejects using hostId as deviceId without matching X-Host-Id", async () => {
    const req = {
      method: "POST",
      url: `/api/rooms/${roomId}/claim`,
      headers: {},
      body: { slotIndex: 0, deviceId: hostId },
    };
    const res = mockRes();
    await claimHandler(req, res);
    expect(res.statusCode).toBe(403);
    expect(res.body.error).toMatch(/host|Host|invalid/i);
  });

  it("returns 409 when host tries to claim a slot already taken by another device", async () => {
    await store.set(roomId, {
      roomId,
      hostId,
      state: validState(2),
      claims: { "0": "other-player-device" },
      createdAt: Date.now(),
      expiresAt: null,
    });
    const req = {
      method: "POST",
      url: `/api/rooms/${roomId}/claim`,
      headers: { "x-host-id": hostId },
      body: { slotIndex: 0, deviceId: hostId },
    };
    const res = mockRes();
    await claimHandler(req, res);
    expect(res.statusCode).toBe(409);
  });

  it("allows host to reclaim the same slot already held by hostId", async () => {
    await store.set(roomId, {
      roomId,
      hostId,
      state: validState(2),
      claims: { "0": hostId },
      createdAt: Date.now(),
      expiresAt: null,
    });
    const req = {
      method: "POST",
      url: `/api/rooms/${roomId}/claim`,
      headers: { "x-host-id": hostId },
      body: { slotIndex: 0, deviceId: hostId },
    };
    const res = mockRes();
    await claimHandler(req, res);
    expect(res.statusCode).toBe(200);
  });

  it("OPTIONS includes X-Host-Id in Access-Control-Allow-Headers", async () => {
    const req = { method: "OPTIONS", url: `/api/rooms/${roomId}/claim`, headers: {} };
    let allowHeaders = "";
    const res = {
      setHeader(name, val) {
        if (name === "Access-Control-Allow-Headers") allowHeaders = val;
      },
      status() {
        return this;
      },
      end() {},
    };
    await claimHandler(req, res);
    expect(allowHeaders).toMatch(/X-Host-Id/i);
  });
});

describe("Host join as player: API daubs", () => {
  const roomId = "HOSTJP2";
  const hostId = "22222222-2222-2222-2222-222222222222";

  beforeEach(async () => {
    await store.remove(roomId);
    const state = validState(2);
    // Cell (0,0) and (1,1) on makeCard() are 1 and 19 — daubs must match drawn numbers (server-validated).
    state.drawnSequence = [1, 19];
    await store.set(roomId, {
      roomId,
      hostId,
      state,
      claims: { "0": hostId },
      createdAt: Date.now(),
      expiresAt: null,
    });
  });

  it("allows host to POST daubs for their slot with X-Host-Id (no join token)", async () => {
    const req = {
      method: "POST",
      url: `/api/rooms/${roomId}/daubs`,
      headers: { "x-host-id": hostId, "content-type": "application/json" },
      body: { slotIndex: 0, deviceId: hostId, daubs: ["0,0", "1,1"] },
    };
    const res = mockRes();
    await daubsHandler(req, res);
    expect(res.statusCode).toBe(200);
    const room = await store.get(roomId);
    expect(room.state.participantDaubs["0"]).toEqual(["0,0", "1,1"]);
  });

  it("rejects daubs with deviceId hostId but wrong X-Host-Id", async () => {
    const req = {
      method: "POST",
      url: `/api/rooms/${roomId}/daubs`,
      headers: { "x-host-id": "wrong", "content-type": "application/json" },
      body: { slotIndex: 0, deviceId: hostId, daubs: ["0,0"] }, // 0,0 is 1 — in drawnSequence
    };
    const res = mockRes();
    await daubsHandler(req, res);
    expect(res.statusCode).toBe(403);
  });

  it("OPTIONS for daubs includes X-Host-Id in Allow-Headers", async () => {
    const req = { method: "OPTIONS", url: `/api/rooms/${roomId}/daubs`, headers: {} };
    let allowHeaders = "";
    const res = {
      setHeader(name, val) {
        if (name === "Access-Control-Allow-Headers") allowHeaders = val;
      },
      status() {
        return this;
      },
      end() {},
    };
    await daubsHandler(req, res);
    expect(allowHeaders).toMatch(/X-Host-Id/i);
  });
});

describe("Host join as player: UI markers", () => {
  it("bingo.html has Join as player button and hostJoinAsPlayer hook", () => {
    const html = readFileSync(join(__dirname, "bingo.html"), "utf8");
    expect(html).toMatch(/id="host-join-as-player-btn"/);
    expect(html).toMatch(/hostJoinAsPlayer/);
    expect(html).toMatch(/host-join-as-player-btn/);
  });

  it("player.html supports hostPlayer query and host session keys for fetch", () => {
    const html = readFileSync(join(__dirname, "player.html"), "utf8");
    expect(html).toMatch(/hostPlayer/);
    expect(html).toMatch(/bingabu-remote-hostId/);
    expect(html).toMatch(/X-Host-Id/i);
  });

  it("bingo.html writes localStorage handoff so a new tab can read hostId (sessionStorage is per-tab)", () => {
    const html = readFileSync(join(__dirname, "bingo.html"), "utf8");
    expect(html).toMatch(/bingabu-host-player-handoff/);
  });

  it("player.html consumes host-player handoff from localStorage when hostPlayer=1", () => {
    const html = readFileSync(join(__dirname, "player.html"), "utf8");
    expect(html).toMatch(/bingabu-host-player-handoff/);
  });
});
