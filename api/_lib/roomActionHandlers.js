/**
 * Room sub-routes (join, claim, daubs, …) bundled for one Vercel function.
 * Each handler receives (req, res, roomId).
 */
import * as store from "./store.js";
import { verifyPassword } from "./password.js";
import { sign, verify } from "./jwt.js";
import { getClientIp } from "./clientIp.js";
import {
  rateLimitJoin,
  rateLimitClaim,
  rateLimitDaubs,
  retryAfterSeconds,
} from "./rateLimit.js";
import { filterAllowedDaubs } from "./daubFilter.js";
import { getKeyPrefix } from "./keyPrefix.js";

const STREAM_DURATION_MS = 8000;
const POLL_INTERVAL_MS = 1500;

function getQuery(req) {
  const u = req.url || "";
  const i = u.indexOf("?");
  return i >= 0 ? new URLSearchParams(u.slice(i)) : new URLSearchParams();
}

function streamGetAuth(req) {
  const q = getQuery(req);
  const joinToken = q.get("joinToken");
  if (joinToken) {
    const rid = verify(joinToken);
    if (rid) return { type: "joinToken", roomId: rid };
  }
  const hostId = q.get("hostId") || (req.headers && req.headers["x-host-id"]);
  if (hostId) return { type: "hostId", hostId };
  return null;
}

export async function handleStream(req, res, roomId) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const room = await store.get(roomId);
  if (!room) {
    return res.status(404).json({ error: "Room not found" });
  }

  const auth = streamGetAuth(req);
  const isPasswordProtected = !!(room.passwordHash && room.passwordSalt);
  const isHost = auth && auth.type === "hostId" && room.hostId === auth.hostId;
  const hasJoinToken = auth && auth.type === "joinToken" && auth.roomId === roomId;

  if (isPasswordProtected && !isHost && !hasJoinToken) {
    return res.status(403).json({ error: "Password required" });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (typeof res.flushHeaders === "function") res.flushHeaders();

  let lastUpdated = room.updatedAt || room.createdAt || 0;

  const interval = setInterval(async () => {
    try {
      const current = await store.get(roomId);
      if (current && (current.updatedAt || current.createdAt) > lastUpdated) {
        lastUpdated = current.updatedAt || current.createdAt;
        res.write(`data: ${JSON.stringify({ updatedAt: lastUpdated })}\n\n`);
      }
    } catch (_) {}
  }, POLL_INTERVAL_MS);

  return new Promise((resolve) => {
    setTimeout(() => {
      clearInterval(interval);
      try {
        res.end();
      } catch (_) {}
      resolve();
    }, STREAM_DURATION_MS);
  });
}

export async function handleJoin(req, res, roomId) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const ip = getClientIp(req);
  const rl = await rateLimitJoin(ip);
  if (!rl.success) {
    res.setHeader("Retry-After", String(retryAfterSeconds(rl.reset)));
    return res.status(429).json({ error: "Too many requests" });
  }

  const room = await store.get(roomId);
  if (!room) {
    return res.status(404).json({ error: "Room not found" });
  }

  if (!room.passwordHash || !room.passwordSalt) {
    return res.status(400).json({ error: "Room is not password-protected" });
  }

  let body;
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
  } catch (_) {
    return res.status(400).json({ error: "Invalid JSON" });
  }

  const password = body.password != null ? String(body.password) : "";
  if (!verifyPassword(password, room.passwordSalt, room.passwordHash)) {
    return res.status(401).json({ error: "Wrong password" });
  }

  const joinToken = sign(roomId);
  return res.status(200).json({
    joinToken,
    state: room.state,
    claims: room.claims || {},
    expiresAt: room.expiresAt,
  });
}

function claimGetAuth(req) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const rid = verify(token);
    if (rid) return { type: "joinToken", roomId: rid };
  }
  return null;
}

export async function handleClaim(req, res, roomId) {
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

  const room = await store.get(roomId);
  if (!room) {
    return res.status(404).json({ error: "Room not found" });
  }

  const auth = claimGetAuth(req);
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

  // When joinLocked, block taking another device's seat; empty slots stay claimable
  // (e.g. after host boot or a player leaves) without turning the lock off.
  if (room.joinLocked && !isHostRequest) {
    room.claims = room.claims || {};
    const existingClaim = room.claims[String(slotIndex)];
    if (existingClaim && existingClaim !== deviceId) {
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

function daubsGetAuth(req) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const rid = verify(token);
    if (rid) return { type: "joinToken", roomId: rid };
  }
  return null;
}

export async function handleDaubs(req, res, roomId) {
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
  const rl = await rateLimitDaubs(ip);
  if (!rl.success) {
    res.setHeader("Retry-After", String(retryAfterSeconds(rl.reset)));
    return res.status(429).json({ error: "Too many requests" });
  }

  const room = await store.get(roomId);
  if (!room) {
    return res.status(404).json({ error: "Room not found" });
  }

  const auth = daubsGetAuth(req);
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
  const daubs = body.daubs;

  if (typeof slotIndex !== "number" || slotIndex < 0 || slotIndex >= (room.state.numParticipants || 0)) {
    return res.status(400).json({ error: "Invalid slotIndex" });
  }
  if (!deviceId || typeof deviceId !== "string") {
    return res.status(400).json({ error: "Invalid deviceId" });
  }
  if (!Array.isArray(daubs)) {
    return res.status(400).json({ error: "Invalid daubs" });
  }

  if (deviceId === room.hostId && !isHostRequest) {
    return res.status(403).json({ error: "Host authentication required for host player device id" });
  }

  room.claims = room.claims || {};
  if (room.claims[String(slotIndex)] !== deviceId) {
    return res.status(403).json({ error: "Only the claimed player can update daubs" });
  }

  room.state = room.state || {};
  room.state.participantDaubs = room.state.participantDaubs || {};
  const filtered = filterAllowedDaubs(room.state, slotIndex, daubs);
  room.state.participantDaubs[String(slotIndex)] = filtered;
  room.updatedAt = Date.now();
  await store.set(roomId, room);

  return res.status(200).json({
    roomId: room.roomId,
    state: room.state,
    expiresAt: room.expiresAt,
  });
}

export async function handleBoot(req, res, roomId) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Host-Id");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const room = await store.get(roomId);
  if (!room) {
    return res.status(404).json({ error: "Room not found" });
  }

  const hostId = req.headers["x-host-id"];
  if (!hostId || room.hostId !== hostId) {
    return res.status(403).json({ error: "Only the host can boot a player" });
  }

  let body;
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
  } catch (_) {
    return res.status(400).json({ error: "Invalid JSON" });
  }

  const slotIndex = body.slotIndex;
  if (typeof slotIndex !== "number" || slotIndex < 0) {
    return res.status(400).json({ error: "Invalid slotIndex" });
  }

  room.claims = room.claims || {};
  delete room.claims[String(slotIndex)];
  room.updatedAt = Date.now();
  await store.set(roomId, room);

  return res.status(200).json({
    roomId: room.roomId,
    state: room.state,
    claims: room.claims,
    expiresAt: room.expiresAt,
  });
}

export async function handleLeave(req, res, roomId) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const room = await store.get(roomId);
  if (!room) {
    return res.status(404).json({ error: "Room not found" });
  }

  let body;
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
  } catch (_) {
    return res.status(400).json({ error: "Invalid JSON" });
  }

  const slotIndex = body.slotIndex;
  const deviceId = body.deviceId;
  if (typeof slotIndex !== "number" || slotIndex < 0) {
    return res.status(400).json({ error: "Invalid slotIndex" });
  }

  room.claims = room.claims || {};
  if (room.claims[String(slotIndex)] === deviceId) {
    delete room.claims[String(slotIndex)];
  }
  room.updatedAt = Date.now();
  await store.set(roomId, room);

  return res.status(200).json({
    roomId: room.roomId,
    state: room.state,
    claims: room.claims,
    expiresAt: room.expiresAt,
  });
}

async function appendReport(roomId, entry) {
  const creds =
    typeof process !== "undefined" &&
    (process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL) &&
    (process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN);
  if (!creds) return;
  try {
    const { Redis } = await import("@upstash/redis");
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN,
    });
    const key = `${getKeyPrefix()}report:${roomId}`;
    await redis.lpush(key, JSON.stringify(entry));
    await redis.ltrim(key, 0, 99);
    await redis.expire(key, 7 * 24 * 60 * 60);
  } catch (_) {}
}

export async function handleReport(req, res, roomId) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const ip = getClientIp(req);
  const rl = await rateLimitJoin(ip);
  if (!rl.success) {
    res.setHeader("Retry-After", String(retryAfterSeconds(rl.reset)));
    return res.status(429).json({ error: "Too many requests" });
  }

  const room = await store.get(roomId);
  if (!room) {
    return res.status(404).json({ error: "Room not found" });
  }

  let body = {};
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
  } catch (_) {
    return res.status(400).json({ error: "Invalid JSON" });
  }

  const message = body.message != null ? String(body.message).slice(0, 2000) : "";
  await appendReport(roomId, {
    at: Date.now(),
    ip,
    message: message || "(no message)",
  });

  return res.status(204).end();
}
