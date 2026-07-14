import { chromium, devices } from "@playwright/test";
import { spawn } from "node:child_process";
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";

const ROOT = process.cwd();
const ADMIN_ROOT = path.join(ROOT, "apps", "admin", "dist");
const PORT = Number(process.env.ADMIN_REAL_UI_PORT || 4374);
const BASE_URL = `http://127.0.0.1:${PORT}`;
const preferredApiBase = (process.env.ADMIN_REAL_API_TARGET || process.env.API_BASE || "https://ejoyflie.cloud/api").replace(/\/+$/, "");
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";
const MOCK_KEY = "lumi-draw:use-mock-data";
const ADMIN_TOKEN_KEY = "lumi-admin-token";
let apiBase = preferredApiBase;

const types = new Map([
  [".css", "text/css; charset=utf-8"],
  [".eot", "application/vnd.ms-fontobject"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".ttf", "font/ttf"],
  [".webp", "image/webp"],
  [".woff", "font/woff"],
  [".woff2", "font/woff2"]
]);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function smokeImage(seed, width = 800, height = 800) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#5b9fe8"/><stop offset=".55" stop-color="#62c9b7"/><stop offset="1" stop-color="#f6b28f"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/><circle cx="${width * 0.34}" cy="${height * 0.28}" r="${Math.max(width, height) * 0.22}" fill="#fff" opacity=".35"/><path d="M0 ${height * 0.74} C ${width * 0.25} ${height * 0.56}, ${width * 0.5} ${height * 0.92}, ${width} ${height * 0.66} L ${width} ${height} L 0 ${height} Z" fill="#0f1f3a" opacity=".22"/><text x="50%" y="52%" text-anchor="middle" font-family="Arial" font-size="${Math.max(24, width / 20)}" fill="#fff" opacity=".76">${seed}</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: ROOT,
      env: { ...process.env, ...options.env },
      shell: process.platform === "win32",
      stdio: "inherit"
    });
    child.on("error", reject);
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${command} ${args.join(" ")} exited with code ${code}`))));
  });
}

async function apiRequest(method, pathName, body, token) {
  const response = await fetch(`${apiBase}${pathName}`, {
    method,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {})
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const json = await response.json().catch(() => null);
  if (!response.ok || json?.code !== 0) {
    throw new Error(`${method} ${pathName} failed: HTTP ${response.status} ${json?.message || ""}`);
  }
  return json.data;
}

async function resolveApiBase() {
  const candidates = [preferredApiBase];
  for (const candidate of candidates) {
    try {
      apiBase = candidate;
      await apiRequest("GET", "/health");
      return candidate;
    } catch {
      // Try next known endpoint.
    }
  }
  throw new Error(`No reachable API base found. Tried: ${candidates.join(", ")}`);
}

function resolveFile(url = "/") {
  const pathname = decodeURIComponent(url.split("?")[0] || "/");
  const requested = path.resolve(ADMIN_ROOT, `.${pathname}`);
  const safePath = requested.startsWith(ADMIN_ROOT) ? requested : ADMIN_ROOT;
  if (existsSync(safePath) && statSync(safePath).isFile()) return safePath;
  if (existsSync(safePath) && statSync(safePath).isDirectory()) {
    const index = path.join(safePath, "index.html");
    if (existsSync(index)) return index;
  }
  return path.join(ADMIN_ROOT, "index.html");
}

async function proxyApi(req, res) {
  const targetUrl = `${apiBase}${req.url.slice("/api".length)}`;
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const body = chunks.length ? Buffer.concat(chunks) : undefined;
  const headers = { ...req.headers };
  delete headers.host;

  try {
    const upstream = await fetch(targetUrl, {
      method: req.method,
      headers,
      body: req.method === "GET" || req.method === "HEAD" ? undefined : body
    });
    res.writeHead(upstream.status, Object.fromEntries(upstream.headers.entries()));
    res.end(Buffer.from(await upstream.arrayBuffer()));
  } catch (error) {
    res.writeHead(502, { "content-type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ code: -1, message: error instanceof Error ? error.message : "Proxy failed", data: null }));
  }
}

function serveAdmin() {
  const server = createServer((req, res) => {
    if (req.url?.startsWith("/api/")) {
      void proxyApi(req, res);
      return;
    }

    const file = resolveFile(req.url);
    const ext = path.extname(file);
    res.setHeader("Content-Type", types.get(ext) || "application/octet-stream");
    createReadStream(file)
      .on("error", () => {
        res.writeHead(404);
        res.end("Not found");
      })
      .pipe(res);
  });
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(PORT, "127.0.0.1", () => resolve(server));
  });
}

async function waitFor(check, message, timeoutMs = 10_000) {
  const started = Date.now();
  let lastError;
  while (Date.now() - started < timeoutMs) {
    try {
      if (await check()) return;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 350));
  }
  if (lastError) throw lastError;
  throw new Error(message);
}

async function clickVisibleContainerByText(page, selector, text) {
  await page.evaluate(
    ({ selector: containerSelector, text: expectedText }) => {
      const containers = Array.from(document.querySelectorAll(containerSelector));
      const target = containers.find((element) => {
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && (element.textContent || "").includes(expectedText);
      });
      if (!target) throw new Error(`No visible ${containerSelector} contains ${expectedText}`);
      target.click();
    },
    { selector, text }
  );
}

async function seedSmokeData(adminToken) {
  const suffix = Date.now();
  const userLogin = await apiRequest("POST", "/auth/wechat/login", { code: `mock-admin-ui-${suffix}` });
  const userToken = userLogin.accessToken;
  const nickname = `后台真测用户${String(suffix).slice(-6)}`;
  await apiRequest("PATCH", "/users/me", { nickname, bio: "admin real ui smoke", gender: "male" }, userToken);
  const work = await apiRequest(
    "POST",
    "/works",
    {
      title: `后台真测作品${String(suffix).slice(-6)}`,
      description: "admin real ui work",
      prompt: "admin real ui smoke prompt",
      imageUrl: smokeImage(`admin-real-ui-${suffix}`),
      ratio: "1:1",
      quality: "1K",
      modelId: "smoke-model",
      style: "admin-real-ui",
      isPublic: true
    },
    userToken
  );
  if (work.status === "pending") await apiRequest("POST", `/admin/reviews/${work.id}/approve`, {}, adminToken);
  const banner = await apiRequest(
    "POST",
    "/admin/banners",
    {
      title: `后台真测走马灯${String(suffix).slice(-6)}`,
      description: "admin real ui banner",
      action: "创作页",
      sort: 999,
      enabled: true
    },
    adminToken
  );
  return { user: userLogin.user, userToken, nickname, workId: work.id, workTitle: work.title, bannerId: banner.id, bannerTitle: banner.title };
}

async function cleanupSmokeData(seed, adminToken) {
  await Promise.allSettled([
    apiRequest("DELETE", `/admin/banners/${seed.bannerId}`, undefined, adminToken),
    apiRequest("DELETE", `/admin/works/${seed.workId}`, undefined, adminToken)
  ]);
}

async function main() {
  const resolvedApiBase = await resolveApiBase();
  console.log(`Admin real UI smoke target: ${resolvedApiBase}`);

  const admin = await apiRequest("POST", "/admin/auth/login", { username: ADMIN_USERNAME, password: ADMIN_PASSWORD });
  assert(admin.accessToken, "admin access token missing");
  const seed = await seedSmokeData(admin.accessToken);

  console.log("Building admin with VITE_API_BASE=/api ...");
  await run("corepack", ["pnpm", "--filter", "@lumi-draw/admin", "build"], { env: { VITE_API_BASE: "/api" } });

  const server = await serveAdmin();
  const browser = await chromium.launch();
  const context = await browser.newContext({
    ...devices["Desktop Chrome"],
    locale: "zh-CN"
  });
  await context.addInitScript(
    ({ mockKey, tokenKey, token }) => {
      window.localStorage.setItem(mockKey, "0");
      window.localStorage.setItem(tokenKey, token);
    },
    { mockKey: MOCK_KEY, tokenKey: ADMIN_TOKEN_KEY, token: admin.accessToken }
  );
  const page = await context.newPage();
  const runtimeErrors = [];
  page.on("pageerror", (error) => runtimeErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") runtimeErrors.push(message.text());
  });

  try {
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
    await page.locator(".phone-screen").waitFor({ state: "visible", timeout: 10_000 });
    await page.locator(".stat-grid").first().waitFor({ state: "visible", timeout: 10_000 });
    await page.locator(".grid-nav .gn").filter({ hasText: "用户管理" }).click();
    await page.locator(".nav-title").filter({ hasText: "用户管理" }).waitFor({ state: "visible", timeout: 10_000 });
    await page.locator(".card .lrow").first().waitFor({ state: "visible", timeout: 10_000 });
    const firstUserText = await page.locator(".card .lrow").first().innerText();
    const userId = Number(firstUserText.match(/ID\s+(\d+)/)?.[1] || 0);
    assert(userId > 0, "admin user list did not expose a user id");
    await page.locator(".card .lrow").first().click();
    await page.locator(".nav-title").filter({ hasText: "用户详情" }).waitFor({ state: "visible", timeout: 10_000 });
    const beforeUser = await apiRequest("GET", `/admin/users/${userId}`, undefined, admin.accessToken);
    await page.getByRole("button", { name: /积分/ }).click();
    await page.locator(".sheet.show").waitFor({ state: "visible", timeout: 10_000 });
    await page.locator(".sheet.show input[type='number']").fill("2");
    await page.locator(".sheet.show input").last().fill("admin real ui smoke adjust");
    await page.locator(".sheet.show").getByRole("button", { name: "确定" }).click();
    await page.locator(".sheet.show").waitFor({ state: "hidden", timeout: 10_000 });
    await waitFor(async () => {
      const afterUser = await apiRequest("GET", `/admin/users/${userId}`, undefined, admin.accessToken);
      return afterUser.credits === beforeUser.credits + 2;
    }, "admin user credits adjustment did not persist");

    const beforeGiftUser = await apiRequest("GET", `/admin/users/${userId}`, undefined, admin.accessToken);
    const memberPlans = await apiRequest("GET", "/admin/member-plans", undefined, admin.accessToken);
    const giftPlan = (memberPlans || []).find((plan) => plan.enabled !== false);
    assert(giftPlan?.id, "admin member plan missing for UI smoke");
    await page.getByRole("button", { name: /会员/ }).click();
    await page.locator(".sheet.show").waitFor({ state: "visible", timeout: 10_000 });
    await page.locator(".sheet.show select").selectOption(String(giftPlan.id));
    await page.locator(".sheet.show input").fill("admin real ui smoke member gift");
    await page.locator(".sheet.show").getByRole("button", { name: "确定" }).click();
    await page.locator(".sheet.show").waitFor({ state: "hidden", timeout: 10_000 });
    await waitFor(async () => {
      const afterGiftUser = await apiRequest("GET", `/admin/users/${userId}`, undefined, admin.accessToken);
      return afterGiftUser.memberPlan === giftPlan.name && afterGiftUser.credits === beforeGiftUser.credits + giftPlan.giftCredits;
    }, "admin member gift did not persist");

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.locator(".grid-nav .gn").filter({ hasText: "作品管理" }).click();
    await page.locator(".nav-title").filter({ hasText: "作品管理" }).waitFor({ state: "visible", timeout: 10_000 });
    await page.locator(".wcard").first().waitFor({ state: "visible", timeout: 10_000 });
    const worksPage = await apiRequest("GET", "/admin/works?page=1&pageSize=100", undefined, admin.accessToken);
    const targetWork = worksPage.items?.[0];
    assert(targetWork?.id, "admin works API did not expose a work for UI smoke");
    await page.locator(".wcard").first().click();
    await page.locator(".nav-title").filter({ hasText: "作品详情" }).waitFor({ state: "visible", timeout: 10_000 });
    await page.getByText(targetWork.title).first().waitFor({ state: "visible", timeout: 10_000 });
    await page.locator(".kv .switch").nth(0).click();
    await page.locator(".kv .switch").nth(1).click();
    await waitFor(async () => {
      const work = await apiRequest("GET", `/admin/works/${targetWork.id}`, undefined, admin.accessToken);
      return work.featured === !targetWork.featured && work.recommend === !targetWork.recommend;
    }, "admin work feature/recommend toggles did not persist");
    await apiRequest("POST", `/admin/works/${targetWork.id}/feature`, { featured: targetWork.featured }, admin.accessToken);
    await apiRequest("POST", `/admin/works/${targetWork.id}/recommend`, { recommend: targetWork.recommend }, admin.accessToken);

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.locator(".grid-nav .gn").filter({ hasText: "运营配置" }).click();
    await page.locator(".nav-title").filter({ hasText: "运营配置" }).waitFor({ state: "visible", timeout: 10_000 });
    await page.getByText("走马灯管理").click();
    await page.locator(".nav-title").filter({ hasText: "走马灯管理" }).waitFor({ state: "visible", timeout: 10_000 });
    await page.getByText(seed.bannerTitle).waitFor({ state: "visible", timeout: 10_000 });
    await page.locator(".card").filter({ hasText: seed.bannerTitle }).locator(".switch").click();
    await waitFor(async () => {
      const banners = await apiRequest("GET", "/admin/banners", undefined, admin.accessToken);
      const banner = banners.find((item) => item.id === seed.bannerId);
      return banner?.enabled === false;
    }, "admin banner enabled toggle did not persist");

    await page.locator(".nav-avatar").click();
    await page.locator(".sheet.show").waitFor({ state: "visible", timeout: 10_000 });
    await page.locator(".sheet.show").getByRole("button", { name: "退出登录" }).click();
    await page.getByText("请登录管理员账号").waitFor({ state: "visible", timeout: 10_000 });
    const loggedOut = await page.evaluate((tokenKey) => !window.localStorage.getItem(tokenKey), ADMIN_TOKEN_KEY);
    assert(loggedOut, "admin logout did not clear token");

    assert(runtimeErrors.length === 0, `browser runtime errors: ${runtimeErrors.join("; ")}`);
    console.log("Admin real UI smoke passed.");
  } finally {
    await browser.close();
    server.close();
    await cleanupSmokeData(seed, admin.accessToken);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
