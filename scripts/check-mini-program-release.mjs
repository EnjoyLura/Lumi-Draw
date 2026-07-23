#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { readUniJson } from "./uni-json.mjs";

const ROOT = process.cwd();
const SOURCE_DIR = path.join(ROOT, "apps", "mobile", "src");
const DIST_DIR = path.join(ROOT, "apps", "mobile", "dist", "build", "mp-weixin");
const failures = [];

function fail(message) {
  failures.push(message);
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function collectFiles(dir, result = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) collectFiles(fullPath, result);
    else result.push(fullPath);
  }
  return result;
}

if (!fs.existsSync(DIST_DIR)) {
  fail("微信小程序生产包不存在，请先运行 pnpm build:mobile。");
} else {
  const appJsonPath = path.join(DIST_DIR, "app.json");
  const projectConfigPath = path.join(DIST_DIR, "project.config.json");
  const appJson = readJson(appJsonPath);
  const projectConfig = readJson(projectConfigPath);
  const manifest = readUniJson(path.join(SOURCE_DIR, "manifest.json"));

  if (manifest.versionName !== "1.0.0") fail(`首发版本号应为 1.0.0，当前为 ${manifest.versionName || "空"}。`);
  if (!projectConfig.appid || /^(__UNI__|touristappid)/i.test(projectConfig.appid)) fail("生产包未配置真实微信 AppID。");
  if (projectConfig.setting?.urlCheck !== true) fail("微信合法域名校验未开启。");
  if (projectConfig.setting?.minified !== true) fail("上传代码压缩未开启。");
  if (appJson.__usePrivacyCheck__ !== true) fail("微信隐私保护校验未显式开启。");

  const allowedPrivateInfos = new Set([
    "chooseAddress",
    "chooseLocation",
    "choosePoi",
    "getFuzzyLocation",
    "getLocation",
    "onLocationChange",
    "startLocationUpdate",
    "startLocationUpdateBackground"
  ]);
  for (const item of appJson.requiredPrivateInfos || []) {
    if (!allowedPrivateInfos.has(item)) fail(`requiredPrivateInfos 包含微信不允许的字段：${item}`);
  }

  const files = collectFiles(DIST_DIR);
  const totalBytes = files.reduce((sum, file) => sum + fs.statSync(file).size, 0);
  if (totalBytes > 2 * 1024 * 1024) fail(`主包体积 ${totalBytes} 字节超过 2 MiB。`);
  if (files.some((file) => file.endsWith(".map"))) fail("生产包中不应包含 source map。");

  const textFiles = files.filter((file) => /\.(js|json|wxml|wxss)$/i.test(file));
  const compiled = textFiles.map((file) => fs.readFileSync(file, "utf8")).join("\n");
  const banned = [
    ["localhost", /localhost/i],
    ["127.0.0.1", /127\.0\.0\.1/],
    ["服务器 IP 明文接口", /http:\/\/122\.51\.235\.145/i],
    ["H5 模拟登录代码", /mock-h5-/],
    ["调试探针", /\[Lumi (?:probe|performance)\]/],
    ["API 密钥", /sk-[A-Za-z0-9_-]{20,}/]
  ];
  for (const [label, pattern] of banned) {
    if (pattern.test(compiled)) fail(`生产包仍包含${label}。`);
  }
}

const privacyService = fs.readFileSync(path.join(SOURCE_DIR, "services", "wechatPrivacy.ts"), "utf8");
for (const token of ["requirePrivacyAuthorize", "openPrivacyContract", "getPrivacySetting"]) {
  if (!privacyService.includes(token)) fail(`微信隐私流程缺少 ${token}。`);
}

const settingsPage = fs.readFileSync(path.join(SOURCE_DIR, "pages", "settings", "index.vue"), "utf8");
for (const token of ["注销账号", "cancelAccount", "openWechatPrivacyContract"]) {
  if (!settingsPage.includes(token)) fail(`设置页缺少上线必需能力：${token}`);
}

if (failures.length) {
  console.error(["微信小程序上线检查失败：", ...failures.map((item) => `- ${item}`)].join("\n"));
  process.exit(1);
}

console.log("微信小程序上线检查通过。");
