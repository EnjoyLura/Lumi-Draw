import { expect, test } from "@playwright/test";

const MOCK_KEY = "lumi-draw:use-mock-data";

const routes = [
  ["home", "/#/pages/home/index", ".home-page"],
  ["create", "/#/pages/create/index", ".create-page"],
  ["plaza", "/#/pages/plaza/index", ".plaza-page"],
  ["gallery", "/#/pages/gallery/index", ".gallery-page"],
  ["mine", "/#/pages/mine/index", ".mine-page"],
  ["all gameplays", "/#/pages/all-gameplays/index", ".all-gameplays-page"],
  ["search", "/#/pages/search/index", ".search-page"],
  ["reverse prompt", "/#/pages/reverse-prompt/index", ".reverse-page"],
  ["work detail", "/#/pages/work-detail/index?id=1", ".detail-page"],
  ["recharge", "/#/pages/recharge/index", ".recharge-page"],
  ["messages", "/#/pages/messages/index", ".messages-page"],
  ["settings", "/#/pages/settings/index", ".settings-page"]
];

test.beforeEach(async ({ page }) => {
  await page.addInitScript((key) => {
    window.localStorage.setItem(key, "1");
  }, MOCK_KEY);
});

for (const [name, url, selector] of routes) {
  test(`mobile h5 renders ${name}`, async ({ page }) => {
    const runtimeErrors = [];
    page.on("pageerror", (error) => {
      if (error.message === "Object" && !error.stack) return;
      runtimeErrors.push(error.message);
    });
    page.on("console", async (message) => {
      if (message.type() !== "error") return;
      const args = await Promise.all(
        message.args().map(async (arg) => {
          try {
            return await arg.jsonValue();
          } catch {
            return String(arg);
          }
        })
      );
      if (message.text() === "Object") return;
      runtimeErrors.push(`${message.text()} ${JSON.stringify(args)}`);
    });

    await page.goto(url);
    await expect(page.locator(selector).first()).toBeVisible();
    await expect(page.locator("body")).not.toHaveText("");

    const box = await page.locator(selector).first().boundingBox();
    expect(box?.width ?? 0).toBeGreaterThan(300);
    expect(box?.height ?? 0).toBeGreaterThan(300);
    expect(runtimeErrors).toEqual([]);
  });
}
