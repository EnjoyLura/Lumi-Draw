import type { Request } from "express";

export function requestUserIp(req: Request) {
  const forwarded = req.headers["x-forwarded-for"];
  const raw = (Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(",")[0]) || req.ip || req.socket.remoteAddress || "";
  return raw.trim().replace(/^::ffff:/, "").slice(0, 64);
}
