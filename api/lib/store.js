/**
 * Room store: in-memory with optional file persistence for local dev.
 * Uses globalThis so the same Map is shared within a process; when running in Node,
 * also persists to .bingabu-rooms.json in the project root so multiple processes
 * (e.g. different Vercel dev invocations) see the same rooms.
 * For production with multiple instances, use Vercel KV.
 */

import fs from "fs";
import path from "path";

const ROOM_TTL_SEC = 24 * 60 * 60; // 24 hours

const memory = globalThis.__bingabu_rooms ?? new Map();
if (!globalThis.__bingabu_rooms) globalThis.__bingabu_rooms = memory;

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
    // ignore write errors (e.g. read-only fs)
  }
}

function get(roomId) {
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

function set(roomId, room) {
  if (!room.expiresAt) {
    room.expiresAt = Date.now() + ROOM_TTL_SEC * 1000;
  }
  memory.set(roomId, room);
  if (typeof process !== "undefined" && process.env) saveToFile();
}

function remove(roomId) {
  memory.delete(roomId);
  if (typeof process !== "undefined" && process.env) saveToFile();
}

export { get, set, remove, ROOM_TTL_SEC };
