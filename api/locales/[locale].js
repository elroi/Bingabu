import {
  SUPPORTED_LOCALES,
  getMergedLocale,
} from "../lib/localeStore.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const locale = req.query && req.query.locale;
  if (!SUPPORTED_LOCALES.includes(locale)) {
    return res.status(404).json({ error: "Unknown locale" });
  }

  try {
    const merged = await getMergedLocale(locale);
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
    return res.status(200).json(merged);
  } catch (e) {
    return res.status(500).json({ error: "Failed to load locale" });
  }
}
