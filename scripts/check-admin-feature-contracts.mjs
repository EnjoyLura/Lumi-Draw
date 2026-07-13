import { readFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const ADMIN_SRC = path.join(ROOT, "apps", "admin", "src");
const REGISTRY = path.join(ADMIN_SRC, "pages", "registry.tsx");
const MENU = path.join(ADMIN_SRC, "shell", "menu.ts");
const API = path.join(ADMIN_SRC, "data", "api.ts");

function readText(file) {
  return readFileSync(file, "utf8");
}

function assertIncludes(source, token, context, errors) {
  if (!source.includes(token)) errors.push(`${context} missing token: ${token}`);
}

const registryPageContracts = [
  "home",
  "dashboard",
  "dataDetail",
  "users",
  "userDetail",
  "works",
  "workDetail",
  "review",
  "reviewDetail",
  "ops",
  "opsBanner",
  "opsGameplay",
  "opsStyle",
  "opsCategory",
  "opsHotSearch",
  "opsModel",
  "opsQuality",
  "opsRatio",
  "finance",
  "finRecharge",
  "finMember",
  "finCheckin",
  "finInvite",
  "finTxn",
  "setBase",
  "settings",
  "setAudit",
  "setSensitive",
  "setVersion",
  "setAgreement",
  "messages",
  "msgAnnounce",
  "msgPush",
  "msgFeedback"
];

const menuContracts = [
  "home",
  "dashboard",
  "users",
  "works",
  "review",
  "opsBanner",
  "opsGameplay",
  "opsStyle",
  "opsCategory",
  "opsHotSearch",
  "opsModel",
  "opsQuality",
  "opsRatio",
  "finance",
  "finRecharge",
  "finMember",
  "finCheckin",
  "finInvite",
  "finTxn",
  "setBase",
  "msgAnnounce",
  "msgPush",
  "msgFeedback",
  "settings"
];

const adminApiPathContracts = [
  "/admin/auth/login",
  "/admin/dashboard/summary",
  "/admin/dashboard/trends",
  "/admin/dashboard/detail",
  "/admin/users",
  "/admin/works",
  "/admin/works/upload-image",
  "/admin/reviews",
  "/admin/reports",
  "/admin/feedback",
  "/admin/banners",
  "/admin/gameplays",
  "/admin/styles",
  "/admin/categories",
  "/admin/hot-searches",
  "/admin/models",
  "/admin/qualities",
  "/admin/ratios",
  "/admin/recharge-tiers",
  "/admin/member-plans",
  "/admin/checkin-config",
  "/admin/invite-config",
  "/admin/credits/config",
  "/admin/transactions",
  "/admin/announcements",
  "/admin/pushes",
  "/admin/settings",
  "/admin/review-settings",
  "/admin/sensitive-words",
  "/admin/versions",
  "/admin/agreements/"
];

function main() {
  const errors = [];
  const registry = readText(REGISTRY);
  const menu = readText(MENU);
  const api = readText(API);

  for (const id of registryPageContracts) {
    assertIncludes(registry, `${id}:`, "admin page registry", errors);
  }

  for (const id of menuContracts) {
    assertIncludes(menu, `id: "${id}"`, "admin drawer menu", errors);
  }

  for (const id of registryPageContracts) {
    if (id === "dataDetail" || id.endsWith("Detail")) {
      assertIncludes(menu, `${id}:`, "admin page title", errors);
    }
  }

  for (const apiPath of adminApiPathContracts) {
    assertIncludes(api, apiPath, "admin api contract", errors);
  }

  if (errors.length) {
    console.error(["Admin feature contract check failed:", ...errors.map((item) => `- ${item}`)].join("\n"));
    process.exit(1);
  }

  console.log(
    `Admin feature contract check passed (${registryPageContracts.length} pages, ${menuContracts.length} menu entries, ${adminApiPathContracts.length} API paths).`
  );
}

main();
