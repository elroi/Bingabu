import * as store from "../../lib/store.js";
import { verifyPassword } from "../../lib/password.js";
import { sign } from "../../lib/jwt.js";

function parsePath(url) {
  const path = (url || "").split("?")[0] || "";
  const parts = path.split("/").filter(Boolean);
  return parts[parts.length - 2] || null; // .../rooms/ABC123/join -> ABC123
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const roomId = parsePath(req.url);
  if (!roomId) {
    return res.status(400).json({ error: "Missing roomId" });
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
