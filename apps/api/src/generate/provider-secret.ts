import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const VERSION = "v1";

function encryptionKey(masterSecret: string) {
  if (masterSecret.length < 32) throw new Error("GENERATION_PROVIDER_ENCRYPTION_KEY must contain at least 32 characters");
  return createHash("sha256").update(masterSecret, "utf8").digest();
}

export function encryptProviderApiKey(apiKey: string, masterSecret: string) {
  const value = apiKey.trim();
  if (!value) return "";
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(masterSecret), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString("base64url"), tag.toString("base64url"), encrypted.toString("base64url")].join(".");
}

export function decryptProviderApiKey(ciphertext: string, masterSecret: string) {
  if (!ciphertext) return "";
  const [version, ivValue, tagValue, encryptedValue] = ciphertext.split(".");
  if (version !== VERSION || !ivValue || !tagValue || !encryptedValue) throw new Error("Invalid encrypted generation provider key");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(masterSecret), Buffer.from(ivValue, "base64url"));
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(encryptedValue, "base64url")), decipher.final()]).toString("utf8");
}

export function providerApiKeyHint(apiKey: string) {
  return apiKey ? `••••${apiKey.slice(-4)}` : "";
}
