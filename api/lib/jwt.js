/**
 * Simple join token: base64(roomId:timestamp:hmac) so we don't need a secret in MVP.
 * Valid for 24h. For production use a proper JWT with a secret.
 */
import crypto from "crypto";

const SECRET = process.env.JOIN_TOKEN_SECRET || "bingabu-join-secret-change-in-production";
const TTL_MS = 24 * 60 * 60 * 1000;

function sign(roomId) {
  const payload = `${roomId}:${Date.now()}`;
  const sig = crypto.createHmac("sha256", SECRET).update(payload).digest("hex");
  return Buffer.from(`${payload}:${sig}`).toString("base64url");
}

function verify(token) {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const [roomId, ts, sig] = decoded.split(":");
    if (!roomId || !ts || !sig) return null;
    const payload = `${roomId}:${ts}`;
    const expected = crypto.createHmac("sha256", SECRET).update(payload).digest("hex");
    if (!crypto.timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expected, "hex"))) return null;
    const age = Date.now() - Number(ts);
    if (age < 0 || age > TTL_MS) return null;
    return roomId;
  } catch (_) {
    return null;
  }
}

export { sign, verify };
