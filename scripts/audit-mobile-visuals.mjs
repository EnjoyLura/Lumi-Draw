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

const interactionCases = [
  {
    name: "create-model-drawer",
    label: "Create model drawer",
    route: "pages/create/index",
    action: async (page) => {
      await page.locator(".model-card").first().click();
      await page.locator(".model-sheet.show").waitFor({ state: "visible", timeout: 8_000 });
    }
  },
  {
    name: "create-result-preview",
    label: "Create generation result preview",
    route: "pages/create/index",
    action: async (page) => {
      await page.locator(".prompt-input textarea").fill("Visual audit mock generation prompt");
      await page.locator(".style-card").first().click();
      const createButton = page.locator(".create-btn");
      await createButton.scrollIntoViewIfNeeded();
      await createButton.evaluate((element) => element.click());
      await page
        .locator(".generating-card, .result-wrap")
        .first()
        .waitFor({ state: "visible", timeout: 15_000 });
      await page.locator(".result-img").first().waitFor({ state: "visible", timeout: 15_000 });
      await page.locator(".result-img").first().click();
      await page.locator(".preview-sheet.show").waitFor({ state: "visible", timeout: 8_000 });
    }
  },
  {
    name: "plaza-side-drawer",
    label: "Plaza side drawer",
    route: "pages/plaza/index",
    action: async (page) => {
      await page.locator(".menu-btn").click();
      await page.locator(".side-drawer.show").waitFor({ state: "visible", timeout: 8_000 });
    }
  },
  {
    name: "plaza-filter-drawer",
    label: "Plaza filter drawer",
    route: "pages/plaza/index",
    action: async (page) => {
      await page.locator(".filter-btn").click();
      await page.locator(".filter-sheet.show").waitFor({ state: "visible", timeout: 8_000 });
    }
  },
  {
    name: "gallery-manage-bar",
    label: "Gallery manage selection",
    route: "pages/gallery/index",
    action: async (page) => {
      await page.locator(".manage-btn").click();
      await page.locator(".manage-bar.show").waitFor({ state: "visible", timeout: 8_000 });
      await page.locator(".select-dot").first().click();
    }
  },
  {
    name: "work-detail-long-press",
    label: "Work detail long-press sheet",
    route: "pages/work-detail/index",
    action: async (page) => {
      const image = page.locator(".detail-image").first();
      await image.dispatchEvent("mousedown");
      await page.waitForTimeout(700);
      await image.dispatchEvent("mouseup");
      await page.locator(".long-press-sheet.show").waitFor({ state: "visible", timeout: 8_000 });
    }
  },
  {
    name: "user-unfollow-confirm",
    label: "User unfollow confirm dialog",
    route: "pages/user-profile/index",
    action: async (page) => {
      const button = page.locator(".follow-btn");
      await button.click();
      await button.click();
      await page.locator(".dialog-overlay").waitFor({ state: "visible", timeout: 8_000 });
    }
  },
  {
    name: "gallery-logged-out",
    label: "Gallery logged-out state",
    route: "pages/settings/index",
    action: async (page) => {
      await page.locator(".logout-btn").click();
      await page.locator(".logout-btn.login").waitFor({ state: "visible", timeout: 8_000 });
      await page.goto(`${BASE_URL}/#/pages/gallery/index`, { waitUntil: "domcontentloaded" });
      await page.locator(".gallery-login-prompt").waitFor({ state: "visible", timeout: 8_000 });
    }
  }
];

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

function collectRuntimeErrors(page) {
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
  return {
    errors,
    dispose() {
      page.off("pageerror", onPageError);
      page.off("console", onConsole);
    }
  };
}

async function waitForReadablePage(page) {
  await page.waitForFunction(() => (document.body?.innerText || "").trim().length > 0, null, { timeout: 10_000 });
}

async function openRoute(page, route) {
  const url = pageUrl(route);
  if (page.url() === url) {
    await page.reload({ waitUntil: "domcontentloaded" });
  } else {
    await page.goto(url, { waitUntil: "domcontentloaded" });
  }
  await waitForReadablePage(page);
  return url;
}

async function capture(page, outDir, screenshotName, extra = {}) {
  await page.screenshot({ path: path.join(outDir, screenshotName), fullPage: true });
  const metrics = await page.evaluate(() => ({
    title: document.title,
    textLength: document.body?.innerText?.trim().length || 0,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    scrollHeight: document.documentElement.scrollHeight
  }));
  return {
    screenshot: screenshotName,
    ...metrics,
    ...extra
  };
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
  const interactionResults = [];

  try {
    for (const route of routes) {
      const monitor = collectRuntimeErrors(page);
      const url = await openRoute(page, route);
      results.push(
        await capture(page, outDir, `${fileSafe(route)}.png`, {
          route,
          url,
          errors: monitor.errors
        })
      );
      monitor.dispose();
    }

    for (const testCase of interactionCases) {
      const monitor = collectRuntimeErrors(page);
      let actionError = "";
      let url = "";
      try {
        url = await openRoute(page, testCase.route);
        await testCase.action(page);
      } catch (error) {
        actionError = error instanceof Error ? error.message : String(error);
      }

      interactionResults.push(
        await capture(page, outDir, `state__${testCase.name}.png`, {
          name: testCase.name,
          label: testCase.label,
          route: testCase.route,
          url,
          errors: [...monitor.errors, ...(actionError ? [actionError] : [])]
        })
      );
      monitor.dispose();
    }
  } finally {
    await browser.close();
    server.close();
  }

  const failures = results.filter((item) => item.errors.length || item.textLength === 0);
  const interactionFailures = interactionResults.filter((item) => item.errors.length || item.textLength === 0);
  const index = [
    "# Mobile H5 Visual Audit",
    "",
    `- Generated at: ${new Date().toISOString()}`,
    `- Page screenshots: ${results.length}`,
    `- Page failures: ${failures.length}`,
    `- Interaction state screenshots: ${interactionResults.length}`,
    `- Interaction failures: ${interactionFailures.length}`,
    "- Prototype source: `prototype/mobile-prototype.html`",
    "",
    "## Pages",
    "",
    "| Page | Screenshot | Text length | Page height | Runtime errors |",
    "| --- | --- | ---: | ---: | --- |",
    ...results.map((item) => {
      const errors = item.errors.length ? item.errors.join("<br>") : "None";
      return `| \`${item.route}\` | [${item.screenshot}](./${item.screenshot}) | ${item.textLength} | ${item.scrollHeight} | ${errors} |`;
    }),
    "",
    "## Interaction States",
    "",
    "| State | Route | Screenshot | Text length | Runtime errors |",
    "| --- | --- | --- | ---: | --- |",
    ...interactionResults.map((item) => {
      const errors = item.errors.length ? item.errors.join("<br>") : "None";
      return `| ${item.label} | \`${item.route}\` | [${item.screenshot}](./${item.screenshot}) | ${item.textLength} | ${errors} |`;
    }),
    ""
  ].join("\n");

  writeFileSync(path.join(outDir, "index.md"), index, "utf8");
  writeFileSync(path.join(outDir, "summary.json"), JSON.stringify(results, null, 2), "utf8");
  writeFileSync(path.join(outDir, "interaction-summary.json"), JSON.stringify(interactionResults, null, 2), "utf8");

  console.log(`Mobile visual audit complete: ${outDir}`);
  console.log(`${results.length} pages captured, ${failures.length} pages with errors or empty text.`);
  console.log(`${interactionResults.length} interaction states captured, ${interactionFailures.length} states with errors or empty text.`);

  if (failures.length || interactionFailures.length) process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
