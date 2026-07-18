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

function parseIntOr(value: string | undefined, fallback: number) {
  const n = Number.parseInt(value ?? "", 10);
  return Number.isFinite(n) ? n : fallback;
}

export const appConfig = registerAs("app", () => ({
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: parsePort(process.env.PORT),
  apiPrefix: process.env.API_PREFIX ?? "api",
  docsEnabled: process.env.ENABLE_SWAGGER === "true",
  corsOrigins: parseOrigins(process.env.CORS_ORIGINS),
  databaseUrl: process.env.DATABASE_URL ?? "",
  redisUrl: process.env.REDIS_URL ?? "",
  jwtSecret: process.env.JWT_SECRET ?? "dev-jwt-secret",
  adminJwtSecret: process.env.ADMIN_JWT_SECRET ?? "dev-admin-jwt-secret",
  callbackSecret: process.env.CALLBACK_SECRET ?? "",
  auth: {
    // 开发环境默认允许 mock 登录；生产需显式开启
    allowMockLogin: (process.env.AUTH_ALLOW_MOCK_LOGIN ?? (process.env.NODE_ENV === "production" ? "false" : "true")) === "true",
    accessTtl: parseIntOr(process.env.ACCESS_TOKEN_TTL, 7200), // 秒
    refreshTtlDays: parseIntOr(process.env.REFRESH_TOKEN_TTL_DAYS, 30)
  },
  wx: {
    appId: process.env.WX_APPID ?? "",
    appSecret: process.env.WX_APPSECRET ?? "",
    mchId: process.env.WX_MCH_ID ?? "",
    mchApiKey: process.env.WX_MCH_API_KEY ?? "",
    payApiBase: process.env.WX_PAY_API_BASE ?? "https://api.mch.weixin.qq.com",
    payApiV3Key: process.env.WX_PAY_API_V3_KEY ?? "",
    payCertSerialNo: process.env.WX_PAY_CERT_SERIAL_NO ?? "",
    payPrivateKey: process.env.WX_PAY_PRIVATE_KEY ?? "",
    payPrivateKeyPath: process.env.WX_PAY_PRIVATE_KEY_PATH ?? "",
    payPlatformCertificate: process.env.WX_PAY_PLATFORM_CERTIFICATE ?? "",
    payPlatformCertificatePath: process.env.WX_PAY_PLATFORM_CERTIFICATE_PATH ?? "",
    payPublicKey: process.env.WX_PAY_PUBLIC_KEY ?? "",
    payPublicKeyPath: process.env.WX_PAY_PUBLIC_KEY_PATH ?? "",
    payPublicKeyId: process.env.WX_PAY_PUBLIC_KEY_ID ?? "",
    payNotifyUrl: process.env.WX_PAY_NOTIFY_URL ?? ""
  },
  kie: {
    apiBase: process.env.KIE_API_BASE ?? "https://api.kie.ai",
    apiKey: process.env.KIE_API_KEY ?? "",
    callbackUrl: process.env.KIE_CALLBACK_URL ?? ""
  },
  change2pro: {
    apiBase: process.env.CHANGE2PRO_API_BASE ?? "https://api.change2pro.com",
    imageApiKey: process.env.CHANGE2PRO_IMAGE_API_KEY ?? "",
    bananaApiKey: process.env.CHANGE2PRO_BANANA_API_KEY ?? ""
  },
  ainb: {
    apiBase: process.env.AINB_API_BASE ?? "https://ainb.plus",
    imageApiKey: process.env.AINB_IMAGE_API_KEY ?? ""
  },
  imageTransfer: {
    functionUrl: process.env.IMAGE_TRANSFER_FUNCTION_URL ?? "",
    bearerToken: process.env.IMAGE_TRANSFER_BEARER_TOKEN ?? ""
  },
  generate: {
    allowMock: process.env.GENERATE_ALLOW_MOCK === "true"
  },
  oss: {
    accessKeyId: process.env.OSS_ACCESS_KEY_ID ?? "",
    accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET ?? "",
    bucket: process.env.OSS_BUCKET ?? "",
    endpoint: process.env.OSS_ENDPOINT ?? "",
    cdnBaseUrl: (process.env.CDN_BASE_URL ?? "").replace(/\/+$/, "")
  }
}));
