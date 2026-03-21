/**
 * Room store: in-memory with optional file persistence for local dev,
 * or Upstash Redis when UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are set (Vercel production).
 */

import fs from "fs";
import path from "path";
import { getKeyPrefix } from "./keyPrefix.js";
import { captureException } from "./initObservability.js";

const ROOM_TTL_SEC = 24 * 60 * 60; // 24 hours

function roomRedisKey(roomId) {
  return `${getKeyPrefix()}room:${roomId}`;
}

function lobbyRedisKey() {
  return `${getKeyPrefix()}lobby`;
}

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
      const raw = await redis.get(roomRedisKey(roomId));
      if (raw == null) return null;
      const room = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (room.expiresAt && Date.now() > room.expiresAt) {
        await remove(roomId);
        return null;
      }
      return room;
    } catch (err) {
      captureException(err, { where: "store.get.redis", roomId });
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
  const score = room.updatedAt || room.createdAt || Date.now();
  const redis = await getRedis();
  if (redis) {
    try {
      await redis.set(roomRedisKey(roomId), JSON.stringify(room), { ex: ROOM_TTL_SEC });
      await redis.zadd(lobbyRedisKey(), { score, member: roomId });
      return;
    } catch (err) {
      captureException(err, { where: "store.set.redis", roomId });
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
      await redis.del(roomRedisKey(roomId));
      await redis.zrem(lobbyRedisKey(), roomId);
      return;
    } catch (err) {
      captureException(err, { where: "store.remove.redis", roomId });
    }
  }
  memory.delete(roomId);
  if (typeof process !== "undefined" && process.env) saveToFile();
}

async function listRecent(limit = 20) {
  const redis = await getRedis();
  if (redis) {
    try {
      const roomIds = await redis.zrange(lobbyRedisKey(), 0, limit - 1, { rev: true });
      const rooms = [];
      for (const id of roomIds) {
        const room = await get(id);
        if (room) {
          rooms.push({
            roomId: room.roomId,
            createdAt: room.createdAt,
            updatedAt: room.updatedAt,
            numParticipants: room.state && room.state.numParticipants,
            participantNames: room.state && room.state.participantNames,
          });
        }
      }
      return rooms;
    } catch (_) {
      return [];
    }
  }
  const entries = Array.from(memory.entries())
    .map(([id, room]) => ({ id, room }))
    .filter(({ room }) => !room.expiresAt || room.expiresAt > Date.now())
    .sort((a, b) => (b.room.updatedAt || b.room.createdAt || 0) - (a.room.updatedAt || a.room.createdAt || 0))
    .slice(0, limit);
  return entries.map(({ room }) => ({
    roomId: room.roomId,
    createdAt: room.createdAt,
    updatedAt: room.updatedAt,
    numParticipants: room.state && room.state.numParticipants,
    participantNames: room.state && room.state.participantNames,
  }));
}

export { get, set, remove, listRecent, ROOM_TTL_SEC };
