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

async function responseData(response) {
  const json = await response.json().catch(() => null);
  if (!response.ok() || json?.code !== 0) {
    throw new Error(`${response.request().method()} ${response.url()} failed: HTTP ${response.status()} ${json?.message || ""}`);
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
  const candidates = [preferredApiBase];

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
  const title = `H5 real smoke ${Date.now()}`;
  const created = await apiRequest(
    "POST",
    "/works",
    {
      title,
      description: "Created for mobile H5 real API smoke test",
      prompt: "mobile h5 real api smoke prompt",
      imageUrl: smokeImage("mobile-h5-real-smoke"),
      ratio: "1:1",
      quality: "1K",
      modelId: "smoke-model",
      style: "smoke",
      isPublic: true
    },
    ownerToken
  );
  return { id: created.id, title };
}

async function maybeApproveWork(workId) {
  const username = process.env.ADMIN_USERNAME || "";
  const password = process.env.ADMIN_PASSWORD || "";
  try {
    const admin = await apiRequest("POST", "/admin/auth/login", { username, password });
    await apiRequest("POST", `/admin/reviews/${workId}/approve`, {}, admin.accessToken);
  } catch {
    // Some environments publish immediately or may not expose admin credentials.
  }
}

async function maybeAdminLogin() {
  const username = process.env.ADMIN_USERNAME || "";
  const password = process.env.ADMIN_PASSWORD || "";
  try {
    return await apiRequest("POST", "/admin/auth/login", { username, password });
  } catch {
    return null;
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
  const seededWork = await seedSmokeWork(ownerLogin.accessToken);
  const workId = seededWork.id;
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
    if (message.type() !== "error" || message.text() === "Object") return;
    if (message.text().startsWith("Failed to load resource:")) return;
    runtimeErrors.push(message.text());
  });

  try {
    await page.goto(`${BASE_URL}/#/pages/home/index`, { waitUntil: "domcontentloaded" });
    await page.locator(".home-page").waitFor({ state: "visible", timeout: 10_000 });
    await page.locator(".work-card").first().waitFor({ state: "visible", timeout: 10_000 });

    await page.goto(`${BASE_URL}/#/pages/all-gameplays/index`, { waitUntil: "domcontentloaded" });
    await page.locator(".all-gameplays-page").waitFor({ state: "visible", timeout: 10_000 });
    const bootstrapForEntries = await apiRequest("GET", "/app/bootstrap");
    const firstGameplay = bootstrapForEntries.gameplays?.[0];
    assert(firstGameplay?.name, "real bootstrap gameplays missing for all-gameplays page");
    await page.locator(".gameplay-card").first().waitFor({ state: "visible", timeout: 10_000 });
    const firstGameplayText = await page.locator(".gameplay-name").first().innerText();
    assert(firstGameplayText.includes(firstGameplay.name), "all-gameplays page did not render real gameplay data");
    await page.locator(".gameplay-card").first().click();
    await page.locator(".create-page").waitFor({ state: "visible", timeout: 10_000 });
    await waitFor(async () => {
      const selectedGameplay = await page.locator(".gameplay-card.selected .gameplay-title").innerText().catch(() => "");
      return selectedGameplay.includes(firstGameplay.name);
    }, "all-gameplays page did not apply real gameplay into create page");

    await page.goto(`${BASE_URL}/#/pages/search/index`, { waitUntil: "domcontentloaded" });
    await page.locator(".search-page").waitFor({ state: "visible", timeout: 10_000 });
    await page.locator(".hot-row").first().waitFor({ state: "visible", timeout: 10_000 });
    const searchResponse = page.waitForResponse((response) => response.url().includes("/api/works/search") && response.request().method() === "GET");
    await page.locator(".search-input input").fill(seededWork.title);
    await page.locator(".search-btn").click();
    await responseData(await searchResponse);
    await page.locator(".work-card").first().waitFor({ state: "visible", timeout: 10_000 });
    const searchTitles = await page.locator(".work-title").allInnerTexts();
    assert(searchTitles.some((title) => title.includes(seededWork.title)), "search page did not render the seeded real work");

    await page.goto(`${BASE_URL}/#/pages/agreement/index?type=user`, { waitUntil: "domcontentloaded" });
    await page.locator(".agreement-page").waitFor({ state: "visible", timeout: 10_000 });
    const userAgreement = await apiRequest("GET", "/config/agreements/user");
    await waitFor(async () => {
      const title = await page.locator(".page-title").innerText();
      const content = await page.locator(".content-text").innerText();
      return title.includes(userAgreement.title) && content.length > 10;
    }, "agreement page did not render real agreement content");

    await page.goto(`${BASE_URL}/#/pages/changelog/index`, { waitUntil: "domcontentloaded" });
    await page.locator(".changelog-page").waitFor({ state: "visible", timeout: 10_000 });
    const changelog = await apiRequest("GET", "/config/changelog");
    assert((changelog || []).length > 0, "real changelog missing");
    await waitFor(async () => {
      const versionText = await page.locator(".app-version").innerText();
      return versionText.includes(changelog[0].version);
    }, "changelog page did not render the latest real version");

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

    await page.goto(`${BASE_URL}/#/pages/drafts/index`, { waitUntil: "domcontentloaded" });
    await page.locator(".drafts-page").waitFor({ state: "visible", timeout: 10_000 });
    await page.locator(".work-card").first().waitFor({ state: "visible", timeout: 10_000 });
    const draftTitles = await page.locator(".work-title").allInnerTexts();
    assert(draftTitles.some((title) => title.includes(generationPrompt.slice(0, 12))), "drafts page did not render the generated real draft");

    const publishTitle = `H5 published ${Date.now().toString().slice(-6)}`;
    const publishDescription = `H5 real publish smoke ${Date.now()}`;
    await page.goto(`${BASE_URL}/#/pages/publish/index?draftId=${generatedWorkId}`, { waitUntil: "domcontentloaded" });
    await page.locator(".publish-page").waitFor({ state: "visible", timeout: 10_000 });
    await page.locator(".draft-thumb").waitFor({ state: "visible", timeout: 10_000 });
    await page.locator(".publish-page .text-input input").fill(publishTitle);
    await page.locator(".publish-page .text-area textarea").fill(publishDescription);
    await page.locator(".publish-page .tag-chip").first().click();
    const publishResponse = page.waitForResponse(
      (response) => response.url().includes(`/api/works/${generatedWorkId}`) && response.request().method() === "PATCH"
    );
    await page.locator(".publish-page .submit-btn").click();
    const publishedWork = await responseData(await publishResponse);
    await page.waitForTimeout(1_000);
    assert(publishedWork.title === publishTitle, "publish page response title mismatch");
    if (publishedWork.status === "pending") await maybeApproveWork(generatedWorkId);
    await waitFor(async () => {
      const detail = await apiRequest("GET", `/works/${generatedWorkId}`, undefined, actorLogin.accessToken);
      return detail.title === publishTitle && detail.description === publishDescription && detail.isPublic === true;
    }, "publish page did not persist published work through real API");

    const editedTitle = `H5 edited ${Date.now().toString().slice(-6)}`;
    const editedDescription = `H5 real edit smoke ${Date.now()}`;
    await page.goto(`${BASE_URL}/#/pages/edit-work/index?id=${generatedWorkId}`, { waitUntil: "domcontentloaded" });
    await page.locator(".edit-work-page").waitFor({ state: "visible", timeout: 10_000 });
    await waitFor(async () => {
      const value = await page.locator(".edit-work-page .text-input input").inputValue();
      return value === publishTitle;
    }, "edit work page did not finish loading the published work title");
    await page.locator(".edit-work-page .text-input input").fill(editedTitle);
    await page.locator(".edit-work-page .text-area textarea").fill(editedDescription);
    await page.locator(".edit-work-page .tag-chip").nth(1).click();
    const editResponse = page.waitForResponse(
      (response) => response.url().includes(`/api/works/${generatedWorkId}`) && response.request().method() === "PATCH"
    );
    await page.locator(".edit-work-page .submit-btn").click();
    const editedWork = await responseData(await editResponse);
    await page.waitForTimeout(800);
    assert(editedWork.title === editedTitle, "edit work page response title mismatch");
    await waitFor(async () => {
      const detail = await apiRequest("GET", `/works/${generatedWorkId}`, undefined, actorLogin.accessToken);
      return detail.title === editedTitle && detail.description === editedDescription;
    }, "edit work page did not persist updates through real API");

    await page.goto(`${BASE_URL}/#/pages/follow-list/index?type=following`, { waitUntil: "domcontentloaded" });
    await page.locator(".follow-page").waitFor({ state: "visible", timeout: 10_000 });
    await page.locator(".follow-row").first().waitFor({ state: "visible", timeout: 10_000 });
    const followList = await apiRequest("GET", "/social/follows?type=following&page=1&pageSize=20", undefined, actorLogin.accessToken);
    assert((followList.items || []).some((item) => item.id === ownerLogin.user.id), "follow list API did not include followed owner");
    const unfollowResponse = page.waitForResponse(
      (response) => response.url().includes(`/api/social/users/${ownerLogin.user.id}/follow`) && response.request().method() === "DELETE"
    );
    await page.locator(".follow-row").first().locator(".follow-btn").click();
    const unfollowed = await responseData(await unfollowResponse);
    assert(unfollowed.following === false, "follow list UI did not unfollow through real API");
    await waitFor(async () => {
      const nextList = await apiRequest("GET", "/social/follows?type=following&page=1&pageSize=20", undefined, actorLogin.accessToken);
      return !(nextList.items || []).some((item) => item.id === ownerLogin.user.id);
    }, "follow list unfollow did not persist through real API");

    await page.goto(`${BASE_URL}/#/pages/recharge/index`, { waitUntil: "domcontentloaded" });
    await page.locator(".recharge-page").waitFor({ state: "visible", timeout: 10_000 });
    const [creditBalance, bootstrap] = await Promise.all([
      apiRequest("GET", "/credits/balance", undefined, actorLogin.accessToken),
      apiRequest("GET", "/app/bootstrap")
    ]);
    assert(typeof creditBalance.credits === "number", "real credit balance missing");
    assert((bootstrap.rechargeTiers || []).length > 0, "real recharge tiers missing");
    await page.locator(".tier-card").first().waitFor({ state: "visible", timeout: 10_000 });
    await page.locator(".sub-tab").nth(1).click();
    await page.locator(".sub-tab").nth(1).waitFor({ state: "visible", timeout: 10_000 });
    await page.locator(".custom-card").click();
    await page.locator(".custom-sheet.show").waitFor({ state: "visible", timeout: 10_000 });
    await page.locator(".amount-input input").fill("3");
    await page.locator(".custom-sheet.show .btn.secondary").evaluate((element) => element.click());
    await page.locator(".custom-sheet.show").waitFor({ state: "hidden", timeout: 10_000 });

    await page.goto(`${BASE_URL}/#/pages/checkin/index`, { waitUntil: "domcontentloaded" });
    await page.locator(".checkin-page").waitFor({ state: "visible", timeout: 10_000 });
    const beforeCheckin = await apiRequest("GET", "/checkin/status", undefined, actorLogin.accessToken);
    if (!beforeCheckin.checkedToday) {
      const checkinResponse = page.waitForResponse((response) => response.url().includes("/api/checkin") && response.request().method() === "POST");
      await page.locator(".checkin-btn").click();
      const checkinResult = await responseData(await checkinResponse);
      assert(checkinResult.checked === true, "checkin UI request did not return checked=true");
    }
    await waitFor(async () => {
      const status = await apiRequest("GET", "/checkin/status", undefined, actorLogin.accessToken);
      return status.checkedToday === true;
    }, "checkin status did not persist through real API");

    await page.goto(`${BASE_URL}/#/pages/invite/index`, { waitUntil: "domcontentloaded" });
    await page.locator(".invite-page").waitFor({ state: "visible", timeout: 10_000 });
    const inviteSummary = await apiRequest("GET", "/invite/summary", undefined, actorLogin.accessToken);
    assert(inviteSummary.inviteCode, "invite code missing from real API");
    await page.locator(".invite-code").waitFor({ state: "visible", timeout: 10_000 });
    assert((await page.locator(".invite-code").innerText()).includes(inviteSummary.inviteCode), "invite page did not render real invite code");

    await page.goto(`${BASE_URL}/#/pages/membership/index`, { waitUntil: "domcontentloaded" });
    await page.locator(".membership-page").waitFor({ state: "visible", timeout: 10_000 });
    const memberPlans = await apiRequest("GET", "/membership/plans");
    assert((memberPlans || []).length > 0, "real member plans missing");
    await page.locator(".plan-card").first().waitFor({ state: "visible", timeout: 10_000 });
    await page.locator(".plan-card").first().click();
    await page.locator(".plan-card").first().waitFor({ state: "visible", timeout: 10_000 });
    const memberStatus = await apiRequest("GET", "/membership/status", undefined, actorLogin.accessToken);
    assert(typeof memberStatus.isMember === "boolean", "real member status missing");

    await page.goto(`${BASE_URL}/#/pages/edit-profile/index`, { waitUntil: "domcontentloaded" });
    await page.locator(".edit-page").waitFor({ state: "visible", timeout: 10_000 });
    const nextNickname = `H5 Real ${Date.now().toString().slice(-6)}`;
    const nextBio = `H5 real profile smoke ${Date.now()}`;
    const currentProfile = await apiRequest("GET", "/users/me", undefined, actorLogin.accessToken);
    await waitFor(async () => {
      const value = await page.locator(".field .input input").first().inputValue();
      return value === currentProfile.nickname;
    }, "edit profile page did not finish loading the current user profile");
    await page.locator(".field .input input").first().fill(nextNickname);
    await page.locator(".gender-option").nth(1).click();
    await page.locator(".textarea textarea").fill(nextBio);
    const profileResponse = page.waitForResponse((response) => response.url().includes("/api/users/me") && response.request().method() === "PATCH");
    await page.locator(".save-btn").click();
    const updatedProfile = await responseData(await profileResponse);
    await page.waitForTimeout(700);
    assert(updatedProfile.nickname === nextNickname, "profile UI save response nickname mismatch");
    await waitFor(async () => {
      const profile = await apiRequest("GET", "/users/me", undefined, actorLogin.accessToken);
      return profile.nickname === nextNickname && profile.bio === nextBio && profile.gender === "female";
    }, "profile update did not persist through real API");

    const feedbackContent = `H5 real feedback ${Date.now()}`;
    await page.goto(`${BASE_URL}/#/pages/feedback/index`, { waitUntil: "domcontentloaded" });
    await page.locator(".feedback-page").waitFor({ state: "visible", timeout: 10_000 });
    await page.locator(".type-option").nth(1).click();
    await page.locator(".desc-textarea textarea").fill(feedbackContent);
    await page.locator(".wechat-input input").fill("h5-real-smoke");
    const feedbackResponse = page.waitForResponse((response) => response.url().includes("/api/feedback") && response.request().method() === "POST");
    await page.locator(".submit-btn").click();
    const feedback = await responseData(await feedbackResponse);
    await page.waitForTimeout(700);
    assert(feedback.id && feedback.status, "feedback UI submit did not return persisted row");

    const adminLogin = await maybeAdminLogin();
    if (adminLogin?.accessToken) {
      const feedbackList = await apiRequest("GET", "/admin/feedback?page=1&pageSize=20", undefined, adminLogin.accessToken);
      assert((feedbackList.items || []).some((item) => item.id === feedback.id), "admin feedback list did not include H5 submitted feedback");
    }

    const reportContent = `H5 real report ${Date.now()}`;
    await page.goto(`${BASE_URL}/#/pages/report/index?workId=${workId}`, { waitUntil: "domcontentloaded" });
    await page.locator(".report-page").waitFor({ state: "visible", timeout: 10_000 });
    await page.locator(".reason-row").nth(1).click();
    await page.locator(".desc-input textarea").fill(reportContent);
    const reportResponse = page.waitForResponse(
      (response) => response.url().includes(`/api/social/works/${workId}/report`) && response.request().method() === "POST"
    );
    await page.locator(".submit-btn").click();
    const report = await responseData(await reportResponse);
    await page.waitForTimeout(600);
    assert(report.id && report.status, "report UI submit did not return persisted row");

    if (adminLogin?.accessToken) {
      const reportList = await apiRequest("GET", "/admin/reports?page=1&pageSize=20", undefined, adminLogin.accessToken);
      assert((reportList.items || []).some((item) => item.id === report.id), "admin report list did not include H5 submitted report");
    }

    await page.goto(`${BASE_URL}/#/pages/history/index`, { waitUntil: "domcontentloaded" });
    await page.locator(".history-page").waitFor({ state: "visible", timeout: 10_000 });
    await page.locator(".grid-item").first().waitFor({ state: "visible", timeout: 10_000 });
    const clearHistoryResponse = page.waitForResponse((response) => response.url().includes("/api/social/history") && response.request().method() === "DELETE");
    await page.locator(".clear-btn").click();
    const clearedHistoryResult = await responseData(await clearHistoryResponse);
    assert(clearedHistoryResult.ok === true, "history page clear response mismatch");
    await page.locator(".empty-state").waitFor({ state: "visible", timeout: 10_000 });
    const clearedHistory = await apiRequest("GET", "/social/history?page=1&pageSize=20", undefined, actorLogin.accessToken);
    assert((clearedHistory.items || []).length === 0, "history page clear did not persist through real API");

    if (adminLogin?.accessToken) {
      const replyContent = `H5 real feedback reply ${Date.now()}`;
      await apiRequest("POST", `/admin/feedback/${feedback.id}/reply`, { reply: replyContent }, adminLogin.accessToken);
      await page.goto(`${BASE_URL}/#/pages/messages/index`, { waitUntil: "domcontentloaded" });
      await page.locator(".messages-page").waitFor({ state: "visible", timeout: 10_000 });
      await page.locator(".category-card").first().waitFor({ state: "visible", timeout: 10_000 });
      const serviceMessages = await apiRequest("GET", "/notifications/service", undefined, actorLogin.accessToken);
      assert((serviceMessages || []).some((item) => item.content === replyContent), "feedback reply notification did not persist");
      await page.goto(`${BASE_URL}/#/pages/message-detail/index?type=service`, { waitUntil: "domcontentloaded" });
      await page.locator(".message-detail-page").waitFor({ state: "visible", timeout: 10_000 });
      await waitFor(async () => {
        const summary = await apiRequest("GET", "/notifications/summary", undefined, actorLogin.accessToken);
        const serviceRow = (summary || []).find((item) => item.key === "service");
        return serviceRow?.unread === 0;
      }, "service notifications were not marked read through real UI");
    } else {
      await page.goto(`${BASE_URL}/#/pages/messages/index`, { waitUntil: "domcontentloaded" });
      await page.locator(".messages-page").waitFor({ state: "visible", timeout: 10_000 });
      await page.locator(".category-card").first().waitFor({ state: "visible", timeout: 10_000 });
      const summary = await apiRequest("GET", "/notifications/summary", undefined, actorLogin.accessToken);
      assert(Array.isArray(summary), "notification summary missing from real API");
    }

    await page.goto(`${BASE_URL}/#/pages/settings/index`, { waitUntil: "domcontentloaded" });
    await page.locator(".settings-page").waitFor({ state: "visible", timeout: 10_000 });
    await page.locator(".logout-btn").waitFor({ state: "visible", timeout: 10_000 });
    const logoutResponse = page.waitForResponse((response) => response.url().includes("/api/auth/logout") && response.request().method() === "POST");
    await page.locator(".logout-btn").click();
    await responseData(await logoutResponse);
    await page.locator(".logout-btn.login").waitFor({ state: "visible", timeout: 10_000 });
    const loggedOut = await page.evaluate(
      ({ loginKey, accessKey, refreshKey }) =>
        window.localStorage.getItem(loginKey) === "0" &&
        !window.localStorage.getItem(accessKey) &&
        !window.localStorage.getItem(refreshKey),
      { loginKey: LOGIN_KEY, accessKey: ACCESS_TOKEN_KEY, refreshKey: REFRESH_TOKEN_KEY }
    );
    assert(loggedOut, "settings logout did not clear real H5 session storage");

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
