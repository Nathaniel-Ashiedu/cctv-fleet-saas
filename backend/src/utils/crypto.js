const crypto = require("crypto");
require("dotenv").config();

const ALGORITHM = "aes-256-gcm";
const KEY = Buffer.from(process.env.CREDENTIAL_ENCRYPTION_KEY, "hex");

// Encrypts a plaintext string into a single stored string: iv:authTag:ciphertext (all base64)
function encrypt(plaintext) {
  if (plaintext === null || plaintext === undefined || plaintext === "") return null;

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  const ciphertext = Buffer.concat([cipher.update(String(plaintext), "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [iv.toString("base64"), authTag.toString("base64"), ciphertext.toString("base64")].join(":");
}

// Reverses encrypt(). Returns null if the value isn't in the expected format
// (e.g. legacy plaintext data from before encryption was added).
function decrypt(stored) {
  if (!stored) return null;

  const parts = stored.split(":");
  if (parts.length !== 3) {
    // Not our encrypted format — likely old plaintext test data
    return stored;
  }

  try {
    const [ivB64, authTagB64, ciphertextB64] = parts;
    const iv = Buffer.from(ivB64, "base64");
    const authTag = Buffer.from(authTagB64, "base64");
    const ciphertext = Buffer.from(ciphertextB64, "base64");

    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
    decipher.setAuthTag(authTag);
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return plaintext.toString("utf8");
  } catch (err) {
    console.error("Failed to decrypt credential:", err.message);
    return null;
  }
}

module.exports = { encrypt, decrypt };