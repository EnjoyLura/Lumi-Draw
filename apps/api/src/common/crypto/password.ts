import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

// 用 Node 内置 scrypt 做密码哈希，避免引入 bcrypt 原生依赖（国内服务器构建更稳）。
// 存储格式：scrypt$<saltHex>$<hashHex>

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const salt = Buffer.from(parts[1], "hex");
  const expected = Buffer.from(parts[2], "hex");
  const actual = scryptSync(password, salt, expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

// 生成不透明 refresh token 及其存库哈希
export function generateOpaqueToken(): string {
  return randomBytes(32).toString("hex");
}

export function sha256Hex(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}
