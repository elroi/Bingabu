/**
 * Best-effort client IP for rate limiting (Vercel sets x-forwarded-for).
 */
export function getClientIp(req) {
  const xff = req.headers?.["x-forwarded-for"];
  if (typeof xff === "string" && xff.trim()) {
    return xff.split(",")[0].trim();
  }
  const real = req.headers?.["x-real-ip"];
  if (typeof real === "string" && real.trim()) return real.trim();
  return "unknown";
}
