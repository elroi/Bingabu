import crypto from "crypto";
import { loadLocalEnvIfNeeded } from "./_lib/loadLocalEnv.js";
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

loadLocalEnvIfNeeded();

function headerString(req, name) {
  const v = req.headers[name];
  if (v == null) return "";
  return Array.isArray(v) ? String(v[0] ?? "") : String(v);
}

/**
 * Prefer Authorization Bearer; also accept X-Bingabu-Admin-Token (same secret over HTTPS).
 * Used as a fallback where proxies mishandle Authorization in dev; harmless in production.
 */
function getAdminTokenFromRequest(req) {
  const authz = headerString(req, "authorization");
  if (authz.toLowerCase().startsWith("bearer ")) {
    const t = authz.slice(7).trim();
    if (t) return t;
  }
  const alt = headerString(req, "x-bingabu-admin-token").trim();
  if (alt) return alt;
  return "";
}

/** @returns {{ ok: true } | { ok: false, hint: "no_secret" | "no_bearer" | "mismatch" }} */
function checkAdminAuth(req) {
  const raw = process.env.BINGABU_ADMIN_LOCALES_TOKEN;
  const secret = typeof raw === "string" ? raw.trim() : "";
  if (!secret) return { ok: false, hint: "no_secret" };
  const token = getAdminTokenFromRequest(req);
  if (!token) return { ok: false, hint: "no_bearer" };
  const a = Buffer.from(token, "utf8");
  const b = Buffer.from(secret, "utf8");
  if (a.length !== b.length) return { ok: false, hint: "mismatch" };
  try {
    if (!crypto.timingSafeEqual(a, b)) return { ok: false, hint: "mismatch" };
  } catch (_) {
    return { ok: false, hint: "mismatch" };
  }
  return { ok: true };
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, PUT, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Bingabu-Admin-Token"
  );

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  const auth = checkAdminAuth(req);
  if (!auth.ok) {
    const body = { error: "Unauthorized" };
    const isCloud =
      process.env.VERCEL_ENV === "production" ||
      process.env.VERCEL_ENV === "preview";
    if (auth.hint === "no_secret") {
      body.code = "ADMIN_TOKEN_UNSET";
    }
    if (!isCloud) {
      body.authHint = auth.hint;
      const hasAuthz = !!headerString(req, "authorization");
      const hasX = !!headerString(req, "x-bingabu-admin-token");
      console.warn(
        `[bingabu] admin-locales 401 authHint=${auth.hint} hasAuthorization=${hasAuthz} hasXAdminToken=${hasX}`
      );
    }
    return res.status(401).json(body);
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
