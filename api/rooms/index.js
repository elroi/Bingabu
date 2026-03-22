import crypto from "crypto";
import * as store from "../_lib/store.js";
import { generateSalt, hashPassword } from "../_lib/password.js";
import { getClientIp } from "../_lib/clientIp.js";
import { rateLimitCreateRoom, retryAfterSeconds } from "../_lib/rateLimit.js";
import { isValidGameState } from "../_lib/roomState.js";

const ROOM_ID_LENGTH = 6;
const ROOM_ID_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous 0/O, 1/I

function generateRoomId() {
  let id = "";
  const bytes = crypto.randomBytes(ROOM_ID_LENGTH);
  for (let i = 0; i < ROOM_ID_LENGTH; i++) {
    id += ROOM_ID_CHARS[bytes[i] % ROOM_ID_CHARS.length];
  }
  return id;
}

function isStateValid(state) {
  return isValidGameState(state);
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const ip = getClientIp(req);
  const rl = await rateLimitCreateRoom(ip);
  if (!rl.success) {
    res.setHeader("Retry-After", String(retryAfterSeconds(rl.reset)));
    return res.status(429).json({ error: "Too many requests" });
  }

  let body;
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
  } catch (_) {
    return res.status(400).json({ error: "Invalid JSON" });
  }

  const { state, password } = body;
  if (!isStateValid(state)) {
    return res.status(400).json({ error: "Invalid state" });
  }

  const hostId = crypto.randomUUID();
  let roomId;
  do {
    roomId = generateRoomId();
  } while (await store.get(roomId));

  const room = {
    roomId,
    hostId,
    state,
    claims: {},
    createdAt: Date.now(),
    expiresAt: null,
  };

  if (password != null && String(password).trim() !== "") {
    const salt = generateSalt();
    room.passwordSalt = salt;
    room.passwordHash = hashPassword(String(password).trim(), salt);
  }

  await store.set(roomId, room);

  const host = process.env.VERCEL_URL || "localhost:3000";
  const isLocal = /^localhost(\d*)$|^127\.0\.0\.1(\d*)$/.test(host.replace(/:\d+$/, ""));
  const protocol = isLocal ? "http" : "https";
  const baseUrl = process.env.BASE_URL || `${protocol}://${host}`;
  const shareUrl = `${baseUrl}/join.html?join=${roomId}`;

  return res.status(201).json({ roomId, shareUrl, hostId });
}
