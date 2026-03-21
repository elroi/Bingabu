import * as store from "../../lib/store.js";
import { verify } from "../../lib/jwt.js";
import { getClientIp } from "../../lib/clientIp.js";
import { rateLimitClaim, retryAfterSeconds } from "../../lib/rateLimit.js";

function parsePath(url) {
  const path = (url || "").split("?")[0] || "";
  const parts = path.split("/").filter(Boolean);
  return parts[parts.length - 2] || null;
}

function getAuth(req) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const roomId = verify(token);
    if (roomId) return { type: "joinToken", roomId };
  }
  return null;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Host-Id");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const ip = getClientIp(req);
  const rl = await rateLimitClaim(ip);
  if (!rl.success) {
    res.setHeader("Retry-After", String(retryAfterSeconds(rl.reset)));
    return res.status(429).json({ error: "Too many requests" });
  }

  const roomId = parsePath(req.url);
  if (!roomId) {
    return res.status(400).json({ error: "Missing roomId" });
  }

  const room = await store.get(roomId);
  if (!room) {
    return res.status(404).json({ error: "Room not found" });
  }

  const auth = getAuth(req);
  const isPasswordProtected = !!(room.passwordHash && room.passwordSalt);
  const hostHeader = req.headers["x-host-id"];
  const isHostRequest = typeof hostHeader === "string" && hostHeader === room.hostId;
  const hasJoinToken = auth && auth.type === "joinToken" && auth.roomId === roomId;

  if (isPasswordProtected && !isHostRequest && !hasJoinToken) {
    return res.status(403).json({ error: "Password required" });
  }

  let body;
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
  } catch (_) {
    return res.status(400).json({ error: "Invalid JSON" });
  }

  const slotIndex = body.slotIndex;
  const deviceId = body.deviceId;
  if (typeof slotIndex !== "number" || slotIndex < 0 || slotIndex >= (room.state.numParticipants || 0)) {
    return res.status(400).json({ error: "Invalid slotIndex" });
  }
  if (!deviceId || typeof deviceId !== "string") {
    return res.status(400).json({ error: "Invalid deviceId" });
  }

  if (deviceId === room.hostId && !isHostRequest) {
    return res.status(403).json({ error: "Host authentication required for host player device id" });
  }

  if (room.joinLocked && !isHostRequest) {
    room.claims = room.claims || {};
    const existingClaim = room.claims[String(slotIndex)];
    if (!existingClaim || existingClaim !== deviceId) {
      return res.status(403).json({ error: "Joining is temporarily closed" });
    }
  }

  room.claims = room.claims || {};
  const existingClaim = room.claims[String(slotIndex)];
  if (existingClaim && existingClaim !== deviceId && deviceId === room.hostId) {
    return res.status(409).json({ error: "Slot already taken" });
  }
  room.claims[String(slotIndex)] = deviceId;
  room.updatedAt = Date.now();
  await store.set(roomId, room);

  return res.status(200).json({
    roomId: room.roomId,
    state: room.state,
    claims: room.claims,
    expiresAt: room.expiresAt,
    slotIndex,
  });
}
