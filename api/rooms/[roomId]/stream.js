import * as store from "../../lib/store.js";
import { verify } from "../../lib/jwt.js";

const STREAM_DURATION_MS = 8000;
const POLL_INTERVAL_MS = 1500;

function parsePath(url) {
  const path = (url || "").split("?")[0] || "";
  const segments = path.split("/").filter(Boolean);
  return segments[segments.length - 2] || null;
}

function getQuery(req) {
  const u = req.url || "";
  const i = u.indexOf("?");
  return i >= 0 ? new URLSearchParams(u.slice(i)) : new URLSearchParams();
}

function getAuth(req) {
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

export default async function handler(req, res) {
  if (req.method !== "GET") {
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

  const auth = getAuth(req);
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
