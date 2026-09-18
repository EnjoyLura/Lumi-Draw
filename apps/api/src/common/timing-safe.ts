import { timingSafeEqual } from "node:crypto";

/** 常量时间字符串比较：回调 secret / FC token 校验专用，防时序侧信道。 */
export function timingSafeEqualStrings(a: string | undefined | null, b: string | undefined | null): boolean {
  if (typeof a !== "string" || typeof b !== "string" || !a || !b) return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
