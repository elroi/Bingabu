import * as store from "./lib/store.js";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Cache-Control", "no-store, max-age=0");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Health check (rewritten from /api/health to stay under Hobby 12-function limit)
  if (req.query?.health === "1") {
    return res.status(200).json({ ok: true });
  }

  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(req.query?.limit, 10) || DEFAULT_LIMIT));
  const rooms = await store.listRecent(limit);
  return res.status(200).json({ rooms });
}
