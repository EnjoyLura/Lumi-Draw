#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const DEFAULT_ENV_FILE = path.join(ROOT, "apps", "api", ".env");

function argValue(name) {
  const prefix = `${name}=`;
  const inline = process.argv.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : "";
}

function parseEnvFile(file) {
  const result = {};
  if (!file || !fs.existsSync(file)) return result;
  const content = fs.readFileSync(file, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const equalIndex = line.indexOf("=");
    if (equalIndex <= 0) continue;
    const key = line.slice(0, equalIndex).trim();
    let value = line.slice(equalIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    result[key] = value.replace(/\\n/g, "\n");
  }
  return result;
}

const envFile = argValue("--env-file") || process.env.ENV_FILE || (fs.existsSync(DEFAULT_ENV_FILE) ? DEFAULT_ENV_FILE : "");
const env = { ...process.env, ...parseEnvFile(envFile) };
const failures = [];

function value(name) {
  return String(env[name] ?? "").trim();
}

function isTrue(name) {
  return value(name).toLowerCase() === "true";
}

function requireValue(name, reason) {
  if (!value(name)) failures.push(`${name} is required${reason ? ` (${reason})` : ""}.`);
}

function requireHttpsUrl(name) {
  const current = value(name);
  if (!current) {
    failures.push(`${name} is required.`);
    return;
  }
  if (!/^https:\/\//i.test(current)) failures.push(`${name} must use https://.`);
}

function requireStrongSecret(name, defaults) {
  const current = value(name);
  if (!current) {
    failures.push(`${name} is required.`);
    return;
  }
  if (defaults.includes(current) || current.length < 32) {
    failures.push(`${name} must be a non-default secret with at least 32 characters.`);
  }
}

function requireOneOf(names, reason) {
  if (!names.some((name) => value(name))) failures.push(`${names.join(" or ")} is required${reason ? ` (${reason})` : ""}.`);
}

if (value("NODE_ENV") !== "production") {
  failures.push("NODE_ENV must be production for the production safety gate.");
}

for (const name of ["AUTH_ALLOW_MOCK_LOGIN", "GENERATE_ALLOW_MOCK", "PAYMENT_ALLOW_MOCK"]) {
  if (isTrue(name)) failures.push(`${name} must not be true in production.`);
}

requireStrongSecret("JWT_SECRET", ["dev-jwt-secret", "change-me-in-production"]);
requireStrongSecret("ADMIN_JWT_SECRET", ["dev-admin-jwt-secret", "change-me-in-production"]);
requireStrongSecret("CALLBACK_SECRET", ["change-me-in-production"]);

const adminPassword = value("ADMIN_PASSWORD");
if (!adminPassword) {
  failures.push("ADMIN_PASSWORD is required; otherwise seed/config falls back to admin123.");
} else if (adminPassword === "admin123") {
  failures.push("ADMIN_PASSWORD must not use the default value.");
}

for (const name of [
  "DATABASE_URL",
  "REDIS_URL",
  "WX_APPID",
  "WX_APPSECRET",
  "KIE_API_KEY",
  "OSS_ACCESS_KEY_ID",
  "OSS_ACCESS_KEY_SECRET",
  "OSS_BUCKET",
  "OSS_ENDPOINT"
]) {
  requireValue(name);
}

requireHttpsUrl("KIE_CALLBACK_URL");

const corsOrigins = value("CORS_ORIGINS");
if (!corsOrigins) {
  failures.push("CORS_ORIGINS must be explicit in production; empty value allows all origins.");
} else if (/(^|,)\s*(http:\/\/)?(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?\s*(,|$)/i.test(corsOrigins)) {
  failures.push("CORS_ORIGINS must not include localhost, 127.0.0.1, or [::1] in production.");
}

for (const name of ["WX_MCH_ID", "WX_PAY_API_V3_KEY", "WX_PAY_CERT_SERIAL_NO"]) {
  requireValue(name, "WeChat Pay production signing");
}
requireOneOf(["WX_PAY_PRIVATE_KEY", "WX_PAY_PRIVATE_KEY_PATH"], "WeChat Pay private key");
const hasPlatformCertificate = ["WX_PAY_PLATFORM_CERTIFICATE", "WX_PAY_PLATFORM_CERTIFICATE_PATH"].some((name) => value(name));
const hasPublicKey = ["WX_PAY_PUBLIC_KEY", "WX_PAY_PUBLIC_KEY_PATH"].some((name) => value(name));
if (!hasPlatformCertificate && !hasPublicKey) {
  failures.push(
    "WX_PAY_PLATFORM_CERTIFICATE or WX_PAY_PLATFORM_CERTIFICATE_PATH or WX_PAY_PUBLIC_KEY or WX_PAY_PUBLIC_KEY_PATH is required (WeChat Pay signature verification)."
  );
}
if (hasPublicKey) requireValue("WX_PAY_PUBLIC_KEY_ID", "WeChat Pay public key verification");
requireHttpsUrl("WX_PAY_NOTIFY_URL");

if (failures.length) {
  console.error("Production safety check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  if (envFile) console.error(`Checked env file: ${path.relative(ROOT, envFile) || envFile}`);
  process.exit(1);
}

console.log("Production safety check passed.");
if (envFile) console.log(`Checked env file: ${path.relative(ROOT, envFile) || envFile}`);
