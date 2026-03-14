import * as store from "../../lib/store.js";

function parsePath(url) {
  const path = (url || "").split("?")[0] || "";
  const parts = path.split("/").filter(Boolean);
  return parts[parts.length - 2] || null;
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

  const room = store.get(roomId);
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
  store.set(roomId, room);

  return res.status(200).json({
    roomId: room.roomId,
    state: room.state,
    claims: room.claims,
    expiresAt: room.expiresAt,
  });
}
