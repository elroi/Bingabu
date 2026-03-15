/**
 * Room store: in-memory with optional file persistence for local dev,
 * or Upstash Redis when UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are set (Vercel production).
 */

import fs from "fs";
import path from "path";

const ROOM_TTL_SEC = 24 * 60 * 60; // 24 hours
const ROOM_KEY_PREFIX = "bingabu:room:";

const memory = globalThis.__bingabu_rooms ?? new Map();
if (!globalThis.__bingabu_rooms) globalThis.__bingabu_rooms = memory;

function getRedisEnv() {
  const env = typeof process !== "undefined" && process.env;
  if (!env) return null;
  // Prefer Upstash Redis naming; fall back to Vercel KV naming (KV_REST_API_*)
  const url = env.UPSTASH_REDIS_REST_URL || env.KV_REST_API_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN || env.KV_REST_API_TOKEN;
  return url && token ? { url, token } : null;
}

function useRedis() {
  return !!getRedisEnv();
}

let redisClient = null;
async function getRedis() {
  const creds = getRedisEnv();
  if (!creds) return null;
  if (redisClient) return redisClient;
  try {
    const { Redis } = await import("@upstash/redis");
    redisClient = new Redis({ url: creds.url, token: creds.token });
    return redisClient;
  } catch (_) {
    return null;
  }
}

function getFilePath() {
  try {
    const cwd = process.cwd();
    return path.join(cwd, ".bingabu-rooms.json");
  } catch (_) {
    return null;
  }
}

function loadFromFile() {
  const filePath = getFilePath();
  if (!filePath) return;
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const data = JSON.parse(raw);
    if (data && typeof data === "object") {
      memory.clear();
      for (const [id, room] of Object.entries(data)) {
        memory.set(id, room);
      }
    }
  } catch (_) {
    // file missing or invalid – keep current memory
  }
}

function saveToFile() {
  const filePath = getFilePath();
  if (!filePath) return;
  try {
    const obj = Object.fromEntries(memory);
    fs.writeFileSync(filePath, JSON.stringify(obj, null, 0), "utf8");
  } catch (_) {
    // ignore write errors (e.g. read-only fs on Vercel)
  }
}

async function get(roomId) {
  const redis = await getRedis();
  if (redis) {
    try {
      const raw = await redis.get(ROOM_KEY_PREFIX + roomId);
      if (raw == null) return null;
      const room = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (room.expiresAt && Date.now() > room.expiresAt) {
        await remove(roomId);
        return null;
      }
      return room;
    } catch (_) {
      return null;
    }
  }
  let room = memory.get(roomId);
  if (!room && typeof process !== "undefined" && process.env) {
    loadFromFile();
    room = memory.get(roomId);
  }
  if (!room) return null;
  if (room.expiresAt && Date.now() > room.expiresAt) {
    memory.delete(roomId);
    saveToFile();
    return null;
  }
  return room;
}

async function set(roomId, room) {
  if (!room.expiresAt) {
    room.expiresAt = Date.now() + ROOM_TTL_SEC * 1000;
  }
  const redis = await getRedis();
  if (redis) {
    try {
      await redis.set(ROOM_KEY_PREFIX + roomId, JSON.stringify(room), { ex: ROOM_TTL_SEC });
      return;
    } catch (_) {
      // fall through to memory
    }
  }
  memory.set(roomId, room);
  if (typeof process !== "undefined" && process.env) saveToFile();
}

async function remove(roomId) {
  const redis = await getRedis();
  if (redis) {
    try {
      await redis.del(ROOM_KEY_PREFIX + roomId);
      return;
    } catch (_) {}
  }
  memory.delete(roomId);
  if (typeof process !== "undefined" && process.env) saveToFile();
}

export { get, set, remove, ROOM_TTL_SEC };
