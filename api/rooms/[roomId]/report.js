import * as store from "../../lib/store.js";
import { getKeyPrefix } from "../../lib/keyPrefix.js";
import { getClientIp } from "../../lib/clientIp.js";
import { rateLimitJoin, retryAfterSeconds } from "../../lib/rateLimit.js";

function parsePath(url) {
  const path = (url || "").split("?")[0] || "";
  const parts = path.split("/").filter(Boolean);
  return parts[parts.length - 2] || null;
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

  const ip = getClientIp(req);
  const rl = await rateLimitJoin(ip);
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
