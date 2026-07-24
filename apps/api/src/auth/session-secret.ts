import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const VERSION = "v1";

function key(masterSecret: string) {
  if (masterSecret.length < 32) throw new Error("WX_SESSION_ENCRYPTION_KEY must contain at least 32 characters");
  return createHash("sha256").update(masterSecret, "utf8").digest();
}

export function encryptWechatSessionKey(value: string, masterSecret: string) {
  if (!value) return "";
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(masterSecret), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [VERSION, iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), encrypted.toString("base64url")].join(".");
}

export function decryptWechatSessionKey(value: string, masterSecret: string) {
  if (!value) return "";
  const [version, iv, tag, encrypted] = value.split(".");
  if (version !== VERSION || !iv || !tag || !encrypted) throw new Error("Invalid encrypted WeChat session key");
  const decipher = createDecipheriv("aes-256-gcm", key(masterSecret), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(encrypted, "base64url")), decipher.final()]).toString("utf8");
}
