import crypto from "crypto";

const SALT_BYTES = 16;
const HASH_ALGO = "sha256";

function generateSalt() {
  return crypto.randomBytes(SALT_BYTES).toString("hex");
}

function hashPassword(password, salt) {
  return crypto.createHmac(HASH_ALGO, salt).update(password).digest("hex");
}

function verifyPassword(password, salt, storedHash) {
  if (!salt || !storedHash) return false;
  const h = hashPassword(password, salt);
  return crypto.timingSafeEqual(Buffer.from(h, "hex"), Buffer.from(storedHash, "hex"));
}

export { generateSalt, hashPassword, verifyPassword };
