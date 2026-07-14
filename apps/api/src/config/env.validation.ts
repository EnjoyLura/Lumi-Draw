type Env = Record<string, string | undefined>;

function requireInProduction(env: Env, key: string, errors: string[]) {
  if (env.NODE_ENV === "production" && !env[key]) {
    errors.push(`${key} is required in production`);
  }
}

export function validateEnvironment(env: Env) {
  const errors: string[] = [];
  const port = Number.parseInt(env.PORT ?? "3000", 10);

  if (!Number.isFinite(port) || port < 1 || port > 65535) {
    errors.push("PORT must be a valid TCP port");
  }

  [
    "DATABASE_URL",
    "REDIS_URL",
    "JWT_SECRET",
    "ADMIN_JWT_SECRET",
    "CALLBACK_SECRET",
    "WX_APPID",
    "WX_APPSECRET",
    "KIE_API_KEY",
    "KIE_CALLBACK_URL",
    "OSS_ACCESS_KEY_ID",
    "OSS_ACCESS_KEY_SECRET",
    "OSS_BUCKET",
    "OSS_ENDPOINT"
  ].forEach((key) => requireInProduction(env, key, errors));

  if (env.NODE_ENV === "production") {
    if (!env.CORS_ORIGINS?.trim()) errors.push("CORS_ORIGINS is required in production");
    if (!env.ADMIN_USERNAME?.trim()) errors.push("ADMIN_USERNAME is required in production");
    if (!env.ADMIN_PASSWORD?.trim() || env.ADMIN_PASSWORD === "admin123") errors.push("ADMIN_PASSWORD must be a non-default value in production");
    for (const key of ["AUTH_ALLOW_MOCK_LOGIN", "GENERATE_ALLOW_MOCK", "PAYMENT_ALLOW_MOCK"]) {
      if (env[key] === "true") errors.push(`${key} must not be true in production`);
    }
  }

  if (errors.length) {
    throw new Error(`Invalid environment:\n${errors.map((item) => `- ${item}`).join("\n")}`);
  }

  return env;
}
