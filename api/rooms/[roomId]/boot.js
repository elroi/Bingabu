import * as store from "../../lib/store.js";

function parsePath(url) {
  const path = (url || "").split("?")[0] || "";
  const parts = path.split("/").filter(Boolean);
  return parts[parts.length - 2] || null;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Host-Id");

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
  store.set(roomId, room);

  return res.status(200).json({
    roomId: room.roomId,
    state: room.state,
    claims: room.claims,
    expiresAt: room.expiresAt,
  });
}
