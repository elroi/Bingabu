import * as store from "../lib/store.js";
import { verify } from "../lib/jwt.js";

function getAuth(req) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const roomId = verify(token);
    if (roomId) return { type: "joinToken", roomId };
  }
  const hostId = req.headers["x-host-id"] || (req.query && req.query.hostId);
  if (hostId) return { type: "hostId", hostId };
  return null;
}

function roomResponse(room, includeState = true) {
  const out = {
    roomId: room.roomId,
    claims: room.claims || {},
    expiresAt: room.expiresAt,
  };
  if (includeState) {
    out.state = room.state;
  }
  return out;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, PATCH, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Host-Id");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  let roomId = req.query && req.query.roomId;
  if (!roomId && req.url) {
    const path = req.url.split("?")[0];
    const segments = path.replace(/^https?:\/\/[^/]+/, "").split("/").filter(Boolean);
    roomId = segments[segments.length - 1] || null;
  }
  if (!roomId) {
    return res.status(400).json({ error: "Missing roomId" });
  }

  const room = await store.get(roomId);
  if (!room) {
    return res.status(404).json({ error: "Room not found" });
  }

  const auth = getAuth(req);

  if (req.method === "GET") {
    const isPasswordProtected = !!(room.passwordHash && room.passwordSalt);
    const isHost = auth && auth.type === "hostId" && room.hostId === auth.hostId;
    const hasJoinToken = auth && auth.type === "joinToken" && auth.roomId === roomId;

    if (isPasswordProtected && !isHost && !hasJoinToken) {
      return res.status(200).json({ passwordRequired: true, roomId: room.roomId });
    }

    return res.status(200).json(roomResponse(room));
  }

  if (req.method === "PATCH") {
    if (!auth || auth.type !== "hostId" || room.hostId !== auth.hostId) {
      return res.status(403).json({ error: "Only the host can update the room" });
    }

    let body;
    try {
      body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    } catch (_) {
      return res.status(400).json({ error: "Invalid JSON" });
    }

    const { state } = body;
    if (!state || !Array.isArray(state.drawnSequence)) {
      return res.status(400).json({ error: "Invalid state" });
    }
    const np = state.numParticipants;
    if (typeof np !== "number" || np < 0 || np > 12) {
      return res.status(400).json({ error: "Invalid state" });
    }
    const cards = state.participantCards;
    if (!Array.isArray(cards) || cards.length !== np) {
      return res.status(400).json({ error: "Invalid state" });
    }

    room.state = state;
    room.updatedAt = Date.now();
    await store.set(roomId, room);

    return res.status(200).json(roomResponse(room));
  }

  return res.status(405).json({ error: "Method not allowed" });
}
