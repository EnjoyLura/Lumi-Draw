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

  if (errors.length) {
    throw new Error(`Invalid environment:\n${errors.map((item) => `- ${item}`).join("\n")}`);
  }

  return env;
}
