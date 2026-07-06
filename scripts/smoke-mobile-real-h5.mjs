import { chromium, devices } from "@playwright/test";
import { spawn } from "node:child_process";
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";

const ROOT = process.cwd();
const H5_ROOT = path.join(ROOT, "apps", "mobile", "dist", "build", "h5");
const PORT = Number(process.env.MOBILE_REAL_H5_PORT || 4373);
const BASE_URL = `http://127.0.0.1:${PORT}`;
const preferredApiBase = (process.env.MOBILE_REAL_API_TARGET || "https://ejoyflie.cloud/api").replace(/\/+$/, "");
let apiBase = preferredApiBase;
const MOCK_KEY = "lumi-draw:use-mock-data";
const LOGIN_KEY = "lumi-logged-in";
const ACCESS_TOKEN_KEY = "lumi-mobile-access-token";
const REFRESH_TOKEN_KEY = "lumi-mobile-refresh-token";
const USER_STORAGE_KEY = "lumi-mobile-user";

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

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: ROOT,
      env: { ...process.env, ...options.env },
      shell: process.platform === "win32",
      stdio: "inherit"
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${command} ${args.join(" ")} exited with code ${code}`));
    });
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

function resolveFile(url = "/") {
  const pathname = decodeURIComponent(url.split("?")[0] || "/");
  const requested = path.resolve(H5_ROOT, `.${pathname}`);
  const safePath = requested.startsWith(H5_ROOT) ? requested : H5_ROOT;
  if (existsSync(safePath) && statSync(safePath).isFile()) return safePath;
  if (existsSync(safePath) && statSync(safePath).isDirectory()) {
    const index = path.join(safePath, "index.html");
    if (existsSync(index)) return index;
  }
  return path.join(H5_ROOT, "index.html");
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

async function resolveApiBase() {
  const candidates = Array.from(
    new Set([
      preferredApiBase,
      "http://122.51.235.145:3000/api"
    ])
  );

  for (const candidate of candidates) {
    try {
      apiBase = candidate;
      await apiRequest("GET", "/health");
      return candidate;
    } catch {
      // Try the next known endpoint. Windows schannel can fail against the HTTPS domain.
    }
  }

  throw new Error(`No reachable API base found. Tried: ${candidates.join(", ")}`);
}

function serveH5() {
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

async function seedSmokeWork(ownerToken) {
  const created = await apiRequest(
    "POST",
    "/works",
    {
      title: `H5 real smoke ${Date.now()}`,
      description: "Created for mobile H5 real API smoke test",
      prompt: "mobile h5 real api smoke prompt",
      imageUrl: "https://example.com/mobile-h5-real-smoke.png",
      ratio: "1:1",
      quality: "1K",
      modelId: "smoke-model",
      style: "smoke",
      isPublic: true
    },
    ownerToken
  );
  return created.id;
}

async function maybeApproveWork(workId) {
  const username = process.env.ADMIN_USERNAME || "admin";
  const password = process.env.ADMIN_PASSWORD || "admin123";
  try {
    const admin = await apiRequest("POST", "/admin/auth/login", { username, password });
    await apiRequest("POST", `/admin/reviews/${workId}/approve`, {}, admin.accessToken);
  } catch {
    // Some environments publish immediately or may not expose admin credentials.
  }
}

async function cleanupWork(workId, ownerToken) {
  try {
    await apiRequest("DELETE", `/works/${workId}?action=delete`, undefined, ownerToken);
  } catch {
    // Smoke cleanup should not hide the test result.
  }
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

async function main() {
  const resolvedApiBase = await resolveApiBase();
  console.log(`Mobile real H5 smoke target: ${resolvedApiBase}`);
  console.log("Building mobile H5 with VITE_API_BASE=/api ...");
  await run("corepack", ["pnpm", "--filter", "@lumi-draw/mobile", "build:h5"], { env: { VITE_API_BASE: "/api" } });

  const ownerLogin = await apiRequest("POST", "/auth/wechat/login", { code: `mock-h5-real-owner-${Date.now()}` });
  const actorLogin = await apiRequest("POST", "/auth/wechat/login", { code: `mock-h5-real-actor-${Date.now()}` });
  const workId = await seedSmokeWork(ownerLogin.accessToken);
  await maybeApproveWork(workId);

  const server = await serveH5();
  const browser = await chromium.launch();
  const context = await browser.newContext({
    ...devices["Pixel 7"],
    locale: "zh-CN"
  });
  await context.addInitScript(
    ({ mockKey, loginKey, accessKey, refreshKey, userKey, login }) => {
      window.localStorage.setItem(mockKey, "0");
      window.localStorage.setItem(loginKey, "1");
      window.localStorage.setItem(accessKey, login.accessToken);
      window.localStorage.setItem(refreshKey, login.refreshToken);
      window.localStorage.setItem(userKey, JSON.stringify(login.user));
    },
    {
      mockKey: MOCK_KEY,
      loginKey: LOGIN_KEY,
      accessKey: ACCESS_TOKEN_KEY,
      refreshKey: REFRESH_TOKEN_KEY,
      userKey: USER_STORAGE_KEY,
      login: actorLogin
    }
  );

  const page = await context.newPage();
  const runtimeErrors = [];
  page.on("pageerror", (error) => {
    if (error.message === "Object" && !error.stack) return;
    runtimeErrors.push(error.message);
  });
  page.on("console", (message) => {
    if (message.type() === "error" && message.text() !== "Object") runtimeErrors.push(message.text());
  });

  try {
    await page.goto(`${BASE_URL}/#/pages/home/index`, { waitUntil: "domcontentloaded" });
    await page.locator(".home-page").waitFor({ state: "visible", timeout: 10_000 });
    await page.locator(".work-card").first().waitFor({ state: "visible", timeout: 10_000 });

    await page.goto(`${BASE_URL}/#/pages/work-detail/index?id=${workId}`, { waitUntil: "domcontentloaded" });
    await page.locator(".detail-page").waitFor({ state: "visible", timeout: 10_000 });
    await page.locator(".bottom-action").first().click();
    await page.locator(".bottom-action.favorite").click();
    await page.locator(".small-btn.primary").click();
    await page.locator(".small-btn.muted").waitFor({ state: "visible", timeout: 10_000 });

    await waitFor(async () => {
      const state = await apiRequest("GET", `/social/works/${workId}/state`, undefined, actorLogin.accessToken);
      return state.liked === true && state.favorited === true && state.following === true;
    }, "like/favorite/follow state did not persist through real API");

    const history = await apiRequest("GET", "/social/history?page=1&pageSize=20", undefined, actorLogin.accessToken);
    assert((history.items || []).some((item) => item.id === workId), "view history did not persist through real API");

    const favorites = await apiRequest("GET", "/social/favorites?page=1&pageSize=20", undefined, actorLogin.accessToken);
    assert((favorites.items || []).some((item) => item.id === workId), "favorite list did not include the real API work");

    await page.goto(`${BASE_URL}/#/pages/create/index`, { waitUntil: "domcontentloaded" });
    await page.locator(".create-page").waitFor({ state: "visible", timeout: 10_000 });
    const generationPrompt = `H5 real backend generation smoke prompt ${Date.now()}`;
    await page.locator(".prompt-input textarea").fill(generationPrompt);
    await page.locator(".create-btn").click({ force: true });
    await page.locator(".result-wrap").waitFor({ state: "visible", timeout: 10_000 });

    let generatedWorkId = 0;
    await waitFor(async () => {
      const jobs = await apiRequest("GET", "/generate/jobs?page=1&pageSize=20", undefined, actorLogin.accessToken);
      const job = (jobs.items || []).find((item) => item.prompt === generationPrompt);
      generatedWorkId = Number(job?.results?.find((item) => item.workId)?.workId || 0);
      return generatedWorkId > 0;
    }, "generated job did not expose an auto-saved draft workId");

    await waitFor(async () => {
      const drafts = await apiRequest("GET", "/works/me/drafts?page=1&pageSize=20", undefined, actorLogin.accessToken);
      return (drafts.items || []).some((item) => item.id === generatedWorkId);
    }, "generated draft was not persisted through real API");

    assert(runtimeErrors.length === 0, `browser runtime errors: ${runtimeErrors.join("; ")}`);
    console.log("Mobile real H5 smoke passed.");
  } finally {
    await browser.close();
    server.close();
    await cleanupWork(workId, ownerLogin.accessToken);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
