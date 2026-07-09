import { expect, test } from "@playwright/test";
import path from "node:path";
import { readUniJson } from "../../scripts/uni-json.mjs";

const MOCK_KEY = "lumi-draw:use-mock-data";
const LOGIN_KEY = "lumi-logged-in";

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
  const pagesJson = readUniJson(path.join(process.cwd(), "apps/mobile/src/pages.json"));
  const registered = pagesJson.pages.map((page) => page.path).sort();
  const covered = routes
    .map(([, url]) => String(url).match(/#\/([^?]+)/)?.[1])
    .filter(Boolean)
    .sort();
  expect(covered).toEqual(registered);
});

test.beforeEach(async ({ page }) => {
  await page.addInitScript(
    ({ mockKey, loginKey }) => {
      window.localStorage.setItem(mockKey, "1");
      window.localStorage.setItem(loginKey, "1");
    },
    { mockKey: MOCK_KEY, loginKey: LOGIN_KEY }
  );
});

function collectRuntimeErrors(page) {
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
  return runtimeErrors;
}

async function replaceInputValue(page, locator, value) {
  await locator.click();
  await page.keyboard.press("Control+A");
  await page.keyboard.press("Backspace");
  await locator.fill(value);
}

for (const [name, url, selector] of routes) {
  test(`mobile h5 renders ${name}`, async ({ page }) => {
    const runtimeErrors = collectRuntimeErrors(page);

    await page.goto(url);
    await expect(page.locator(selector).first()).toBeVisible();
    await expect(page.locator("body")).not.toHaveText("");

    const box = await page.locator(selector).first().boundingBox();
    expect(box?.width ?? 0).toBeGreaterThan(300);
    expect(box?.height ?? 0).toBeGreaterThan(300);
    expect(runtimeErrors).toEqual([]);
  });
}

test("mobile h5 tabbar navigates primary pages", async ({ page }) => {
  const runtimeErrors = collectRuntimeErrors(page);

  for (const [index, selector] of [
    [1, ".plaza-page"],
    [2, ".create-page"],
    [3, ".gallery-page"],
    [4, ".mine-page"]
  ]) {
    await page.goto("/#/pages/home/index");
    await expect(page.locator(".home-page")).toBeVisible();
    await page.locator(".tab-item").nth(index).click({ force: true });
    await expect(page.locator(selector)).toBeVisible();
  }
  expect(runtimeErrors).toEqual([]);
});

test("mobile h5 opens create model drawer", async ({ page }) => {
  const runtimeErrors = collectRuntimeErrors(page);
  await page.goto("/#/pages/create/index");
  await expect(page.locator(".create-page")).toBeVisible();
  await page.locator(".model-card").click();
  await expect(page.locator(".model-sheet.show").first()).toBeVisible();
  await expect(page.locator(".model-drawer-card").first()).toBeVisible();
  expect(runtimeErrors).toEqual([]);
});

test("mobile h5 opens plaza side drawer", async ({ page }) => {
  const runtimeErrors = collectRuntimeErrors(page);
  await page.goto("/#/pages/plaza/index");
  await expect(page.locator(".plaza-page")).toBeVisible();

  await page.locator(".menu-btn").click();
  await expect(page.locator(".side-drawer.show")).toBeVisible();
  expect(runtimeErrors).toEqual([]);
});

test("mobile h5 opens plaza filter drawer", async ({ page }) => {
  const runtimeErrors = collectRuntimeErrors(page);
  await page.goto("/#/pages/plaza/index");
  await expect(page.locator(".plaza-page")).toBeVisible();

  await page.locator(".filter-btn").click();
  await expect(page.locator(".filter-sheet.show")).toBeVisible();
  await page.locator(".filter-sheet.show .btn-gradient").click();
  await expect(page.locator(".filter-sheet.show")).toHaveCount(0);
  expect(runtimeErrors).toEqual([]);
});

test("mobile h5 searches mock works", async ({ page }) => {
  const runtimeErrors = collectRuntimeErrors(page);
  await page.goto("/#/pages/search/index");
  await expect(page.locator(".search-page")).toBeVisible();

  await page.locator(".search-input input").fill("cyberpunk");
  await page.locator(".search-btn").click();

  await expect(page.locator(".work-card").first()).toBeVisible();
  await expect(page.locator(".search-input input")).toHaveValue("cyberpunk");
  await expect(page.locator(".waterfall .work-card")).toHaveCount(2);
  expect(runtimeErrors).toEqual([]);
});

test("mobile h5 toggles work detail like and favorite", async ({ page }) => {
  const runtimeErrors = collectRuntimeErrors(page);
  await page.goto("/#/pages/work-detail/index?id=1");
  await expect(page.locator(".detail-page")).toBeVisible();

  const likeAction = page.locator(".bottom-action").first();
  const favoriteAction = page.locator(".bottom-action.favorite");

  await likeAction.click();
  await expect(likeAction).toHaveClass(/active/);

  await favoriteAction.click();
  await expect(favoriteAction).toHaveClass(/active/);
  expect(runtimeErrors).toEqual([]);
});

test("mobile h5 settings toggles mock data switch", async ({ page }) => {
  const runtimeErrors = collectRuntimeErrors(page);
  await page.goto("/#/pages/settings/index");
  await expect(page.locator(".settings-page")).toBeVisible();

  const mockRow = page.locator(".settings-page .list-row").nth(3);
  await expect(mockRow.locator(".switch")).toHaveClass(/active/);

  await mockRow.click();
  await expect(mockRow.locator(".switch")).not.toHaveClass(/active/);
  await expect.poll(() => page.evaluate((key) => window.localStorage.getItem(key), MOCK_KEY)).toBe("0");

  await mockRow.click();
  await expect(mockRow.locator(".switch")).toHaveClass(/active/);
  await expect.poll(() => page.evaluate((key) => window.localStorage.getItem(key), MOCK_KEY)).toBe("1");
  expect(runtimeErrors).toEqual([]);
});

test("mobile h5 publish form accepts draft, text and tags", async ({ page }) => {
  const runtimeErrors = collectRuntimeErrors(page);
  await page.goto("/#/pages/publish/index");
  await expect(page.locator(".publish-page")).toBeVisible();

  await page.locator(".draft-card").click();
  await expect(page.locator(".picker-sheet.show")).toBeVisible();
  await page.locator(".picker-item").first().click();
  await expect(page.locator(".picker-sheet.show")).toHaveCount(0);
  await expect(page.locator(".draft-selected-title")).toBeVisible();

  const publishTitle = page.locator(".publish-page .text-input input");
  await replaceInputValue(page, publishTitle, "Playwright publish");
  await expect(publishTitle).toHaveValue("Playwright publish");
  await page.locator(".publish-page .text-area textarea").fill("Playwright publish description");
  await expect(page.locator(".publish-page .counter").first()).toContainText("18/30");
  await expect(page.locator(".publish-page .counter").nth(1)).toContainText("30/200");

  await page.locator(".publish-page .tag-chip").first().click();
  await expect(page.locator(".publish-page .tag-chip").first()).toHaveCSS("font-weight", "600");
  expect(runtimeErrors).toEqual([]);
});

test("mobile h5 edit work form accepts text and tags", async ({ page }) => {
  const runtimeErrors = collectRuntimeErrors(page);
  await page.goto("/#/pages/edit-work/index?id=3");
  await expect(page.locator(".edit-work-page")).toBeVisible();

  await page.locator(".edit-work-page .text-input input").fill("Playwright edit");
  await page.locator(".edit-work-page .text-area textarea").fill("Playwright edit description");
  await expect(page.locator(".edit-work-page .counter").first()).toContainText("15/30");
  await expect(page.locator(".edit-work-page .counter").nth(1)).toContainText("27/200");

  await page.locator(".edit-work-page .tag-chip").nth(1).click();
  await expect(page.locator(".edit-work-page .tag-chip").nth(1)).toHaveCSS("font-weight", "600");
  expect(runtimeErrors).toEqual([]);
});

test("mobile h5 exercises points, checkin and membership states", async ({ page }) => {
  const runtimeErrors = collectRuntimeErrors(page);

  await page.goto("/#/pages/recharge/index");
  await expect(page.locator(".recharge-page")).toBeVisible();
  await expect(page.locator(".tier-card").first()).toBeVisible();
  await page.locator(".sub-tab").nth(1).click();
  await expect(page.locator(".sub-tab").nth(1)).toHaveClass(/active/);
  await page.locator(".custom-card").click();
  await expect(page.locator(".custom-sheet.show")).toBeVisible();
  await page.locator(".amount-input input").fill("3");
  await expect(page.locator(".preview-credits")).toContainText("30");
  await page.locator(".custom-sheet.show .btn.secondary").click();
  await expect(page.locator(".custom-sheet.show")).toHaveCount(0);

  await page.goto("/#/pages/checkin/index");
  await expect(page.locator(".checkin-page")).toBeVisible();
  const checkinButton = page.locator(".checkin-btn");
  await checkinButton.click();
  await expect(checkinButton).toHaveClass(/done/);

  await page.goto("/#/pages/membership/index");
  await expect(page.locator(".membership-page")).toBeVisible();
  await page.locator(".plan-card").first().click();
  await expect(page.locator(".plan-card").first()).toHaveClass(/selected/);
  await page.locator(".open-btn").click();
  await expect(page.locator(".member-card")).toBeVisible();

  expect(runtimeErrors).toEqual([]);
});

test("mobile h5 exercises messages, profile editing and invite pages", async ({ page }) => {
  const runtimeErrors = collectRuntimeErrors(page);

  await page.goto("/#/pages/messages/index");
  await expect(page.locator(".messages-page")).toBeVisible();
  await page.locator(".category-card").first().click();
  await expect(page.locator(".message-detail-page")).toBeVisible();
  await expect(page.locator(".message-card").first()).toBeVisible();

  await page.goto("/#/pages/edit-profile/index");
  await expect(page.locator(".edit-page")).toBeVisible();
  await page.locator(".field .input input").first().fill("Playwright User");
  await expect(page.locator(".counter").first()).toContainText("15/20");
  await page.locator(".gender-option").nth(1).click();
  await expect(page.locator(".gender-option").nth(1)).toHaveClass(/active/);
  await page.locator(".textarea textarea").fill("Playwright profile signature");
  await expect(page.locator(".counter").nth(1)).toContainText("28/100");

  await page.goto("/#/pages/invite/index");
  await expect(page.locator(".invite-page")).toBeVisible();
  await expect(page.locator(".invite-code")).toBeVisible();
  await expect(page.locator(".summary-card")).toHaveCount(2);

  expect(runtimeErrors).toEqual([]);
});

test("mobile h5 exercises feedback, report and social follow flows", async ({ page }) => {
  const runtimeErrors = collectRuntimeErrors(page);

  await page.goto("/#/pages/feedback/index");
  await expect(page.locator(".feedback-page")).toBeVisible();
  await page.locator(".type-option").nth(1).click();
  await expect(page.locator(".type-option").nth(1)).toHaveClass(/active/);
  await page.locator(".desc-textarea textarea").fill("Playwright feedback");
  await expect(page.locator(".counter")).toContainText("19/500");
  await page.locator(".wechat-input input").fill("playwright-wechat");

  await page.goto("/#/pages/report/index?workId=1");
  await expect(page.locator(".report-page")).toBeVisible();
  await page.locator(".reason-row").nth(1).click();
  await expect(page.locator(".reason-row").nth(1)).toHaveClass(/selected/);
  await page.locator(".desc-input textarea").fill("Playwright report detail");
  await expect(page.locator(".submit-btn")).toBeEnabled();

  await page.goto("/#/pages/user-profile/index?id=5");
  await expect(page.locator(".profile-page")).toBeVisible();
  const followButton = page.locator(".follow-btn");
  await followButton.click();
  await expect(followButton).toHaveClass(/following/);
  await followButton.click();
  await expect(page.locator(".dialog-overlay")).toBeVisible();
  await page.locator(".dialog-btn.danger").click();
  await expect(followButton).not.toHaveClass(/following/);

  expect(runtimeErrors).toEqual([]);
});

test("mobile h5 runs mock create generation flow", async ({ page }) => {
  await page.addInitScript(() => {
    Math.random = () => 0.5;
  });
  const runtimeErrors = collectRuntimeErrors(page);

  await page.goto("/#/pages/create/index");
  await expect(page.locator(".create-page")).toBeVisible();
  await page.locator(".prompt-input textarea").fill("Playwright mock generation prompt");
  await expect(page.locator(".prompt-count")).toContainText("33/500");
  await page.locator(".style-card").first().click();
  await expect(page.locator(".style-card").first()).toHaveClass(/selected/);
  await page.locator(".option-card").first().click();
  await expect(page.locator(".option-card").first()).toHaveClass(/selected/);
  await page.locator(".ratio-card").first().click();
  await expect(page.locator(".ratio-card").first()).toHaveClass(/selected/);

  await page.locator(".create-btn").click({ force: true });
  await expect(page.locator(".generating-card")).toBeVisible();
  await expect(page.locator(".result-wrap")).toBeVisible({ timeout: 6000 });
  await expect(page.locator(".result-img").first()).toBeVisible();
  await page.locator(".result-img").first().click();
  await expect(page.locator(".preview-sheet.show")).toBeVisible();
  await page.locator(".preview-ghost-btn.icon").click();
  await expect(page.locator(".preview-sheet.show")).toHaveCount(0);

  expect(runtimeErrors).toEqual([]);
});

test("mobile h5 manages gallery selections and generation history filters", async ({ page }) => {
  const runtimeErrors = collectRuntimeErrors(page);

  await page.goto("/#/pages/gallery/index");
  await expect(page.locator(".gallery-page")).toBeVisible();
  await page.locator(".manage-btn").click();
  await expect(page.locator(".manage-btn")).toHaveClass(/active/);
  await expect(page.locator(".manage-bar.show")).toBeVisible();
  await page.locator(".select-dot").first().click();
  await expect(page.locator(".select-dot").first()).toHaveClass(/selected/);
  await expect(page.locator(".delete-btn")).toHaveClass(/enabled/);
  await page.locator(".select-all-btn").click();
  await expect(page.locator(".selected-count")).toBeVisible();

  await page.goto("/#/pages/generation-history/index");
  await expect(page.locator(".generation-history-page")).toBeVisible();
  await page.locator(".filter-item").nth(1).click();
  await expect(page.locator(".filter-item").nth(1)).toHaveClass(/active/);
  await expect(page.locator(".job-card").first()).toBeVisible();
  await page.locator(".filter-item").nth(2).click();
  await expect(page.locator(".filter-item").nth(2)).toHaveClass(/active/);
  await expect(page.locator(".empty-state")).toBeVisible();

  expect(runtimeErrors).toEqual([]);
});

test("mobile h5 applies gameplay and reverse prompt into create", async ({ page }) => {
  const runtimeErrors = collectRuntimeErrors(page);

  await page.goto("/#/pages/all-gameplays/index");
  await expect(page.locator(".all-gameplays-page")).toBeVisible();
  await page.locator(".gameplay-card").first().click();
  await expect(page.locator(".create-page")).toBeVisible();
  await expect(page).toHaveURL(/gameplay=/);

  await page.goto("/#/pages/reverse-prompt/index");
  await expect(page.locator(".reverse-page")).toBeVisible();
  await page.locator(".upload-area").click();
  await expect(page.locator(".preview-wrap")).toBeVisible();
  await page.locator(".hint-input textarea").fill("Playwright reverse hint");
  await page.locator(".analyze-btn").click();
  await expect(page.locator(".result-block")).toBeVisible({ timeout: 3000 });
  await expect(page.locator(".result-textarea textarea")).not.toHaveValue("");
  await page.locator(".action-row .action-btn").nth(1).click();
  await expect(page.locator(".create-page")).toBeVisible();

  expect(runtimeErrors).toEqual([]);
});

test("mobile h5 exercises drafts and history pages", async ({ page }) => {
  const runtimeErrors = collectRuntimeErrors(page);

  await page.goto("/#/pages/drafts/index");
  await expect(page.locator(".drafts-page")).toBeVisible();
  await expect(page.locator(".drafts-page .work-card").first()).toBeVisible();
  await page.locator(".drafts-page .work-card").first().click();
  await expect(page.locator(".detail-page")).toBeVisible();

  await page.goto("/#/pages/history/index");
  await expect(page.locator(".history-page")).toBeVisible();
  await expect(page.locator(".grid-item").first()).toBeVisible();
  await page.locator(".clear-btn").click();
  await expect(page.locator(".empty-state")).toBeVisible();
  await page.locator(".empty-btn").click();
  await expect(page.locator(".plaza-page")).toBeVisible();

  expect(runtimeErrors).toEqual([]);
});

test("mobile h5 exercises follow list and logout state", async ({ page }) => {
  const runtimeErrors = collectRuntimeErrors(page);

  await page.goto("/#/pages/follow-list/index?type=followers&id=1");
  await expect(page.locator(".follow-page")).toBeVisible();
  await expect(page.locator(".follow-row").first()).toBeVisible();
  const followButton = page.locator(".follow-row .follow-btn").first();
  await followButton.click();
  await expect(followButton).toHaveClass(/following/);
  await followButton.click();
  await expect(followButton).not.toHaveClass(/following/);

  await page.goto("/#/pages/settings/index");
  await expect(page.locator(".settings-page")).toBeVisible();
  await page.locator(".logout-btn").click();
  await expect(page.locator(".logout-btn")).toHaveClass(/login/);
  await expect.poll(() => page.evaluate((key) => window.localStorage.getItem(key), LOGIN_KEY)).toBe("0");

  await page.goto("/#/pages/gallery/index");
  await expect(page.locator(".gallery-login-prompt")).toBeVisible();

  expect(runtimeErrors).toEqual([]);
});
