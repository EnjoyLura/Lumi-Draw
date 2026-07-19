import { expect, test } from "@playwright/test";

const MOCK_KEY = "lumi-draw:use-mock-data";

test.beforeEach(async ({ page }) => {
  await page.addInitScript((key) => {
    window.localStorage.setItem(key, "1");
    window.localStorage.removeItem("lumi-admin-token");
  }, MOCK_KEY);
});

test("admin renders mock dashboard shell", async ({ page }) => {
  const runtimeErrors = [];
  page.on("pageerror", (error) => runtimeErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") runtimeErrors.push(message.text());
  });

  await page.goto("/");
  await expect(page.locator(".phone-screen")).toBeVisible();
  await expect(page.locator(".nav-header")).toBeVisible();
  await expect(page.locator(".page-body")).toBeVisible();
  await expect(page.locator(".stat-grid").first()).toBeVisible();
  await expect(page.locator(".grid-nav").first()).toBeVisible();
  expect(runtimeErrors).toEqual([]);
});

test("admin opens mock menu and navigates core sections", async ({ page }) => {
  await page.goto("/");
  await page.locator(".nav-avatar").click();
  await expect(page.locator(".sheet.show")).toBeVisible();
  await page.locator(".sheet.show .lrow").first().click();
  await expect(page.locator(".page-body")).toBeVisible();
  await expect(page.locator(".card").first()).toBeVisible();
});

test("admin opens the complete work upload form", async ({ page }) => {
  await page.goto("/");
  await page.locator(".nav-header .nav-btn").click();
  await page.locator(".drawer.show .ditem", { hasText: "作品管理" }).click();
  await expect(page.locator(".chip", { hasText: "首页推荐" })).toBeVisible();
  await page.getByRole("button", { name: "上传并发布作品" }).click();

  const sheet = page.locator(".sheet.show");
  await expect(sheet).toBeVisible();
  await expect(sheet.getByText("作品图片", { exact: true })).toBeVisible();
  await expect(sheet.getByText("选择作者", { exact: true })).toBeVisible();
  await expect(sheet.getByText("提示词", { exact: true })).toBeVisible();
  await expect(sheet.getByText("模型", { exact: true })).toBeVisible();
  await expect(sheet.getByText("画面比例", { exact: true })).toBeVisible();
  await expect(sheet.getByText("图片精度", { exact: true })).toBeVisible();
  await expect(sheet.getByText("作品风格", { exact: true })).toBeVisible();
  await expect(sheet.getByText("作品标签", { exact: true })).toBeVisible();
  await expect(sheet.locator(".chip", { hasText: "二次元" })).toBeVisible();
  await expect(sheet.getByText("已选择 0/5", { exact: true })).toBeVisible();
  await expect(sheet.locator('input[type="file"]')).toHaveAttribute("accept", "image/png,image/jpeg,image/webp,image/gif");
  await expect(sheet.getByRole("button", { name: "立即发布" })).toBeVisible();
});

test("admin gameplay and style forms provide image upload", async ({ page }) => {
  await page.goto("/");
  await page.locator(".nav-header .nav-btn").click();
  await page.locator(".drawer.show .ditem", { hasText: "玩法模板" }).click();
  await page.locator(".page-body .lrow .nav-btn").first().click();
  await expect(page.locator(".sheet.show").getByText("玩法封面", { exact: true })).toBeVisible();
  await expect(page.locator('.sheet.show input[type="file"]')).toHaveAttribute("accept", "image/png,image/jpeg,image/webp,image/gif");
  await page.locator(".sheet.show .sh-head .nav-btn").click();

  await page.locator(".nav-header .nav-btn").click();
  await page.locator(".drawer.show .ditem", { hasText: "风格管理" }).click();
  await page.locator(".page-body .lrow .nav-btn").nth(2).click();
  await expect(page.locator(".sheet.show").getByText("封面图", { exact: true })).toBeVisible();
  await expect(page.locator('.sheet.show input[type="file"]')).toHaveAttribute("accept", "image/png,image/jpeg,image/webp,image/gif");
});

test("admin manages generation API platforms and model bindings", async ({ page }) => {
  await page.goto("/");
  await page.locator(".nav-header .nav-btn").click();
  await page.locator(".drawer.show .ditem", { hasText: "API 平台" }).click();
  const ainbCard = page.locator(".page-body .card", { hasText: "Ainb" }).first();
  await expect(ainbCard).toBeVisible();
  await expect(ainbCard.getByText("密钥已配置", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "新增 API 平台" }).click();

  const sheet = page.locator(".sheet.show");
  await expect(sheet.getByText("接口类型", { exact: true })).toBeVisible();
  await expect(sheet.getByText("生效的创作模型", { exact: true })).toBeVisible();
  await expect(sheet.getByText("可选请求参数", { exact: true })).toBeVisible();
  await expect(sheet.locator('input[type="checkbox"]')).toHaveCount(MODEL_COUNT);
  await expect(sheet.getByRole("button", { name: "保存" })).toBeVisible();
});

const MODEL_COUNT = 6;
