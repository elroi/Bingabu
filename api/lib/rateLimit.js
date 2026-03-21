import "./initObservability.js";
import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";
import { getKeyPrefix } from "./keyPrefix.js";

function getRedisCreds() {
  const env = typeof process !== "undefined" ? process.env : {};
  const url = env.UPSTASH_REDIS_REST_URL || env.KV_REST_API_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN || env.KV_REST_API_TOKEN;
  return url && token ? { url, token } : null;
}

let redisSingleton = null;
function getRedis() {
  const creds = getRedisCreds();
  if (!creds) return null;
  if (!redisSingleton) redisSingleton = new Redis(creds);
  return redisSingleton;
}

function makeLimiter(name, limit, window) {
  const redis = getRedis();
  if (!redis) return null;
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, window),
    prefix: `${getKeyPrefix()}ratelimit:${name}`,
  });
}

let createRoomLimiter;
let joinLimiter;
let claimLimiter;
let daubsLimiter;

function getCreateRoomLimiter() {
  if (createRoomLimiter === undefined) {
    createRoomLimiter = makeLimiter("create_room", 20, "1 h");
  }
  return createRoomLimiter;
}

function getJoinLimiter() {
  if (joinLimiter === undefined) {
    joinLimiter = makeLimiter("join_password", 60, "1 m");
  }
  return joinLimiter;
}

function getClaimLimiter() {
  if (claimLimiter === undefined) {
    claimLimiter = makeLimiter("claim_slot", 120, "1 m");
  }
  return claimLimiter;
}

function getDaubsLimiter() {
  if (daubsLimiter === undefined) {
    daubsLimiter = makeLimiter("daubs_post", 600, "1 m");
  }
  return daubsLimiter;
}

/**
 * @returns {Promise<{ success: boolean, reset: number }>}
 */
export async function rateLimitCreateRoom(ip) {
  const lim = getCreateRoomLimiter();
  if (!lim) return { success: true, reset: Date.now() };
  const id = `ip:${ip || "unknown"}`;
  return lim.limit(id);
}

export async function rateLimitJoin(ip) {
  const lim = getJoinLimiter();
  if (!lim) return { success: true, reset: Date.now() };
  return lim.limit(`ip:${ip || "unknown"}`);
}

export async function rateLimitClaim(ip) {
  const lim = getClaimLimiter();
  if (!lim) return { success: true, reset: Date.now() };
  return lim.limit(`ip:${ip || "unknown"}`);
}

export async function rateLimitDaubs(ip) {
  const lim = getDaubsLimiter();
  if (!lim) return { success: true, reset: Date.now() };
  return lim.limit(`ip:${ip || "unknown"}`);
}

export function retryAfterSeconds(resetMs) {
  const sec = Math.ceil((resetMs - Date.now()) / 1000);
  return Math.max(1, Math.min(sec, 3600));
}
