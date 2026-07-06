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
