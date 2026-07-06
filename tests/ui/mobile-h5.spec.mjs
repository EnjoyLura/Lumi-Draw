import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";

const MOCK_KEY = "lumi-draw:use-mock-data";

const routes = [
  ["home", "/#/pages/home/index", ".home-page"],
  ["create", "/#/pages/create/index", ".create-page"],
  ["plaza", "/#/pages/plaza/index", ".plaza-page"],
  ["gallery", "/#/pages/gallery/index", ".gallery-page"],
  ["generation history", "/#/pages/generation-history/index", ".generation-history-page"],
  ["mine", "/#/pages/mine/index", ".mine-page"],
  ["all gameplays", "/#/pages/all-gameplays/index", ".all-gameplays-page"],
  ["search", "/#/pages/search/index", ".search-page"],
  ["reverse prompt", "/#/pages/reverse-prompt/index", ".reverse-page"],
  ["work detail", "/#/pages/work-detail/index?id=1", ".detail-page"],
  ["report", "/#/pages/report/index?workId=1", ".report-page"],
  ["user profile", "/#/pages/user-profile/index?id=2", ".profile-page"],
  ["recharge", "/#/pages/recharge/index", ".recharge-page"],
  ["checkin", "/#/pages/checkin/index", ".checkin-page"],
  ["invite", "/#/pages/invite/index", ".invite-page"],
  ["membership", "/#/pages/membership/index", ".membership-page"],
  ["messages", "/#/pages/messages/index", ".messages-page"],
  ["message detail", "/#/pages/message-detail/index?type=system", ".message-detail-page"],
  ["settings", "/#/pages/settings/index", ".settings-page"],
  ["agreement", "/#/pages/agreement/index?type=user", ".agreement-page"],
  ["edit profile", "/#/pages/edit-profile/index", ".edit-page"],
  ["feedback", "/#/pages/feedback/index", ".feedback-page"],
  ["changelog", "/#/pages/changelog/index", ".changelog-page"],
  ["publish", "/#/pages/publish/index?draftId=101", ".publish-page"],
  ["edit work", "/#/pages/edit-work/index?id=1", ".edit-work-page"],
  ["drafts", "/#/pages/drafts/index", ".drafts-page"],
  ["history", "/#/pages/history/index", ".history-page"],
  ["follow list", "/#/pages/follow-list/index?type=following&id=1", ".follow-page"]
];

test("mobile h5 smoke routes cover pages.json", () => {
  const pagesJson = JSON.parse(readFileSync(path.join(process.cwd(), "apps/mobile/src/pages.json"), "utf8"));
  const registered = pagesJson.pages.map((page) => page.path).sort();
  const covered = routes
    .map(([, url]) => String(url).match(/#\/([^?]+)/)?.[1])
    .filter(Boolean)
    .sort();
  expect(covered).toEqual(registered);
});

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
