import { chromium, devices } from "@playwright/test";
import { createReadStream, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";

const ROOT = process.cwd();
const H5_ROOT = path.join(ROOT, "apps", "mobile", "dist", "build", "h5");
const PAGES_JSON = path.join(ROOT, "apps", "mobile", "src", "pages.json");
const OUTPUT_ROOT = path.join(ROOT, "test-results", "mobile-visual-audit");
const PORT = Number(process.env.MOBILE_VISUAL_AUDIT_PORT || 4273);
const BASE_URL = `http://127.0.0.1:${PORT}`;
const MOCK_KEY = "lumi-draw:use-mock-data";
const LOGIN_KEY = "lumi-logged-in";

const routeParams = new Map([
  ["pages/work-detail/index", "?id=1"],
  ["pages/report/index", "?workId=1"],
  ["pages/user-profile/index", "?id=2"],
  ["pages/message-detail/index", "?type=system"],
  ["pages/agreement/index", "?type=user"],
  ["pages/publish/index", "?draftId=101"],
  ["pages/edit-work/index", "?id=1"],
  ["pages/follow-list/index", "?type=following&id=1"]
]);

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

function serveH5() {
  const server = createServer((req, res) => {
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

function pageUrl(route) {
  return `${BASE_URL}/#/${route}${routeParams.get(route) || ""}`;
}

function fileSafe(route) {
  return route.replaceAll("/", "__");
}

function readPages() {
  return JSON.parse(readFileSync(PAGES_JSON, "utf8")).pages.map((page) => page.path);
}

async function main() {
  const routes = readPages();
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outDir = path.join(OUTPUT_ROOT, timestamp);
  mkdirSync(outDir, { recursive: true });

  const server = await serveH5();
  const browser = await chromium.launch();
  const context = await browser.newContext({
    ...devices["Pixel 7"],
    locale: "zh-CN"
  });
  await context.addInitScript(
    ({ mockKey, loginKey }) => {
      window.localStorage.setItem(mockKey, "1");
      window.localStorage.setItem(loginKey, "1");
    },
    { mockKey: MOCK_KEY, loginKey: LOGIN_KEY }
  );

  const page = await context.newPage();
  const results = [];

  try {
    for (const route of routes) {
      const errors = [];
      const onPageError = (error) => {
        if (error.message === "Object" && !error.stack) return;
        errors.push(error.message);
      };
      const onConsole = (message) => {
        if (message.type() === "error" && message.text() !== "Object") errors.push(message.text());
      };
      page.on("pageerror", onPageError);
      page.on("console", onConsole);

      const url = pageUrl(route);
      const screenshotName = `${fileSafe(route)}.png`;
      const screenshotPath = path.join(outDir, screenshotName);
      await page.goto(url, { waitUntil: "domcontentloaded" });
      await page.waitForFunction(() => (document.body?.innerText || "").trim().length > 0, null, { timeout: 10_000 });
      await page.screenshot({ path: screenshotPath, fullPage: true });

      const metrics = await page.evaluate(() => ({
        title: document.title,
        textLength: document.body?.innerText?.trim().length || 0,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        scrollHeight: document.documentElement.scrollHeight
      }));

      results.push({
        route,
        url,
        screenshot: screenshotName,
        errors,
        ...metrics
      });

      page.off("pageerror", onPageError);
      page.off("console", onConsole);
    }
  } finally {
    await browser.close();
    server.close();
  }

  const failures = results.filter((item) => item.errors.length || item.textLength === 0);
  const index = [
    "# 小程序 H5 视觉审计截图",
    "",
    `- 生成时间：${new Date().toISOString()}`,
    `- 页面数量：${results.length}`,
    `- 异常页面：${failures.length}`,
    "- 对照来源：`prototype/mobile-prototype.html`",
    "",
    "| 页面 | 截图 | 文本长度 | 页面高度 | 运行错误 |",
    "| --- | --- | ---: | ---: | --- |",
    ...results.map((item) => {
      const errors = item.errors.length ? item.errors.join("<br>") : "无";
      return `| \`${item.route}\` | [${item.screenshot}](./${item.screenshot}) | ${item.textLength} | ${item.scrollHeight} | ${errors} |`;
    }),
    ""
  ].join("\n");

  writeFileSync(path.join(outDir, "index.md"), index, "utf8");
  writeFileSync(path.join(outDir, "summary.json"), JSON.stringify(results, null, 2), "utf8");

  console.log(`Mobile visual audit complete: ${outDir}`);
  console.log(`${results.length} pages captured, ${failures.length} pages with errors or empty text.`);

  if (failures.length) process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
