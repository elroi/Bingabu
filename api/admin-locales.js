import crypto from "crypto";
import {
  SUPPORTED_LOCALES,
  loadStaticLocale,
  getOverrides,
  setOverrides,
  getMergedLocale,
  validateMergedComplete,
  computeOverrides,
  redisConfigured,
} from "./_lib/localeStore.js";

function verifyAdminToken(req) {
  const secret = process.env.BINGABU_ADMIN_LOCALES_TOKEN;
  if (!secret || typeof secret !== "string") return false;
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) return false;
  const token = authHeader.slice(7);
  const a = Buffer.from(token, "utf8");
  const b = Buffer.from(secret, "utf8");
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(a, b);
  } catch (_) {
    return false;
  }
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, PUT, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (!verifyAdminToken(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (req.method === "GET") {
    try {
      const out = {
        redis: await redisConfigured(),
        locales: {},
      };
      for (const loc of SUPPORTED_LOCALES) {
        const stat = loadStaticLocale(loc);
        const overrides = await getOverrides(loc);
        const merged = await getMergedLocale(loc);
        out.locales[loc] = { static: stat, overrides, merged };
      }
      return res.status(200).json(out);
    } catch (e) {
      return res.status(500).json({ error: "Failed to load locales" });
    }
  }

  if (req.method === "PUT") {
    if (!(await redisConfigured())) {
      return res.status(503).json({
        error:
          "Redis is not configured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN to save overrides.",
      });
    }

    let body = {};
    try {
      body =
        typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
    } catch (_) {
      return res.status(400).json({ error: "Invalid JSON body" });
    }

    const mergedByLoc = body.merged;
    if (!mergedByLoc || typeof mergedByLoc !== "object") {
      return res.status(400).json({ error: "Expected body.merged: { en: {...}, he: {...} }" });
    }

    for (const loc of SUPPORTED_LOCALES) {
      const stat = loadStaticLocale(loc);
      const merged = mergedByLoc[loc];
      const err = validateMergedComplete(merged, stat);
      if (err) {
        return res.status(400).json({ error: `${loc}: ${err}` });
      }
      const overrides = computeOverrides(merged, stat);
      try {
        await setOverrides(loc, overrides);
      } catch (e) {
        if (e && e.message === "REDIS_UNAVAILABLE") {
          return res.status(503).json({ error: "Redis unavailable" });
        }
        throw e;
      }
    }

    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
