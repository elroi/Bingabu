/**
 * Static locale JSON + optional Redis overrides (Upstash).
 * Public site reads merged strings via GET /api/locales/[locale].
 *
 * JSON is read from disk (not `import … assert { type: "json" }`): Vercel’s Node
 * runtime rejects that syntax. `vercel.json` `includeFiles` ships `locales/**`
 * into each API function bundle; we try `process.cwd()` then `__dirname`.
 */

import { readFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { mergeMessages } from "../../i18n.js";
import { getKeyPrefix } from "./keyPrefix.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export const SUPPORTED_LOCALES = ["en", "he"];

const staticLocaleCache = new Map();

function resolveLocaleJsonPath(locale) {
  const file = `${locale}.json`;
  const candidates = [
    join(process.cwd(), "locales", file),
    join(__dirname, "..", "..", "locales", file),
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  return null;
}

const OVERRIDE_KEY = (locale) => `${getKeyPrefix()}i18n:overrides:${locale}`;

let redisSingleton = null;

async function getRedis() {
  if (redisSingleton === false) return null;
  const env = typeof process !== "undefined" ? process.env : {};
  const url = env.UPSTASH_REDIS_REST_URL || env.KV_REST_API_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN || env.KV_REST_API_TOKEN;
  if (!url || !token) {
    redisSingleton = false;
    return null;
  }
  if (redisSingleton) return redisSingleton;
  try {
    const { Redis } = await import("@upstash/redis");
    redisSingleton = new Redis({ url, token });
    return redisSingleton;
  } catch (_) {
    redisSingleton = false;
    return null;
  }
}

export function loadStaticLocale(locale) {
  if (!SUPPORTED_LOCALES.includes(locale)) return {};
  if (staticLocaleCache.has(locale)) {
    return { ...staticLocaleCache.get(locale) };
  }
  const path = resolveLocaleJsonPath(locale);
  if (!path) {
    staticLocaleCache.set(locale, {});
    return {};
  }
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8"));
    const table =
      parsed && typeof parsed === "object" ? { ...parsed } : {};
    staticLocaleCache.set(locale, table);
    return { ...table };
  } catch (_) {
    staticLocaleCache.set(locale, {});
    return {};
  }
}

export async function getOverrides(locale) {
  const r = await getRedis();
  if (!r) return {};
  try {
    const raw = await r.get(OVERRIDE_KEY(locale));
    if (raw == null) return {};
    if (typeof raw === "string") return JSON.parse(raw);
    if (typeof raw === "object") return { ...raw };
    return {};
  } catch (_) {
    return {};
  }
}

export async function setOverrides(locale, overrides) {
  const r = await getRedis();
  if (!r) throw new Error("REDIS_UNAVAILABLE");
  const o = overrides && typeof overrides === "object" ? overrides : {};
  if (Object.keys(o).length === 0) {
    await r.del(OVERRIDE_KEY(locale));
    return;
  }
  await r.set(OVERRIDE_KEY(locale), JSON.stringify(o));
}

export async function getMergedLocale(locale) {
  const stat = loadStaticLocale(locale);
  const ov = await getOverrides(locale);
  return mergeMessages(ov, stat);
}

export function computeOverrides(merged, staticBase) {
  const out = {};
  const base = staticBase || {};
  const m = merged || {};
  for (const k of Object.keys(m)) {
    if (typeof m[k] !== "string") continue;
    if (m[k] !== base[k]) out[k] = m[k];
  }
  return out;
}

/**
 * @returns {string|null} error message or null if ok
 */
export function validateMergedComplete(merged, staticBase) {
  if (merged == null || typeof merged !== "object") return "Invalid merged object";
  const base = staticBase || {};
  const mergedKeys = Object.keys(merged).sort();
  const baseKeys = Object.keys(base).sort();
  if (mergedKeys.length !== baseKeys.length) return "Key set must match static locale exactly";
  for (let i = 0; i < baseKeys.length; i++) {
    if (mergedKeys[i] !== baseKeys[i]) return "Key set must match static locale exactly";
  }
  for (const k of baseKeys) {
    if (typeof merged[k] !== "string") return `Value for "${k}" must be a string`;
  }
  return null;
}

export async function redisConfigured() {
  const r = await getRedis();
  return !!r;
}
