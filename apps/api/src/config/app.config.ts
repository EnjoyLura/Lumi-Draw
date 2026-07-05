import { registerAs } from "@nestjs/config";

function parsePort(value: string | undefined) {
  const port = Number.parseInt(value ?? "3000", 10);
  return Number.isFinite(port) ? port : 3000;
}

function parseOrigins(value: string | undefined) {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export const appConfig = registerAs("app", () => ({
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: parsePort(process.env.PORT),
  apiPrefix: process.env.API_PREFIX ?? "api",
  corsOrigins: parseOrigins(process.env.CORS_ORIGINS),
  databaseUrl: process.env.DATABASE_URL ?? "",
  redisUrl: process.env.REDIS_URL ?? "",
  jwtSecret: process.env.JWT_SECRET ?? "",
  adminJwtSecret: process.env.ADMIN_JWT_SECRET ?? "",
  callbackSecret: process.env.CALLBACK_SECRET ?? "",
  wx: {
    appId: process.env.WX_APPID ?? "",
    appSecret: process.env.WX_APPSECRET ?? "",
    mchId: process.env.WX_MCH_ID ?? "",
    mchApiKey: process.env.WX_MCH_API_KEY ?? ""
  },
  kie: {
    apiBase: process.env.KIE_API_BASE ?? "https://api.kie.ai",
    apiKey: process.env.KIE_API_KEY ?? "",
    callbackUrl: process.env.KIE_CALLBACK_URL ?? ""
  },
  oss: {
    accessKeyId: process.env.OSS_ACCESS_KEY_ID ?? "",
    accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET ?? "",
    bucket: process.env.OSS_BUCKET ?? "",
    endpoint: process.env.OSS_ENDPOINT ?? ""
  }
}));
