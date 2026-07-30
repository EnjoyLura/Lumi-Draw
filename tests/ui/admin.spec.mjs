import { expect, test } from "@playwright/test";

const MOCK_KEY = "lumi-draw:use-mock-data";

test.beforeEach(async ({ page }) => {
  await page.addInitScript((key) => {
    window.localStorage.setItem(key, "1");
    window.localStorage.removeItem("lumi-admin-token");
  }, MOCK_KEY);
});

test("新版后台渲染桌面工作台和响应式导航", async ({ page }) => {
  const runtimeErrors = [];
  page.on("pageerror", (error) => runtimeErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") runtimeErrors.push(message.text());
  });

  await page.goto("/workbench");
  await expect(page.locator(".lumi-admin-v2")).toBeVisible();
  await expect(page.getByRole("heading", { name: "工作台", exact: true })).toBeVisible();
  await expect(page.getByText("运营工作台", { exact: true })).toBeVisible();
  await expect(page.getByText("待办事项", { exact: true })).toBeVisible();
  await expect(page.locator(".ant-pro-sider")).toBeVisible();
  expect(runtimeErrors).toEqual([]);
});

test("用户与作品列表使用真实 URL、表格和详情跳转", async ({ page }) => {
  await page.goto("/users");
  await expect(page.getByRole("heading", { name: "用户管理", exact: true })).toBeVisible();
  await expect(page.getByRole("table")).toBeVisible();
  await expect(page.getByText("共 6 位用户", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "查看" }).first().click();
  await expect(page).toHaveURL(/\/users\/\d+$/);
  await expect(page.getByRole("heading", { name: "用户详情", exact: true })).toBeVisible();

  await page.goto("/works");
  await expect(page.getByRole("heading", { name: "作品管理", exact: true })).toBeVisible();
  await expect(page.getByRole("table")).toBeVisible();
  await expect(page.getByRole("button", { name: "上传作品" })).toBeVisible();
});

test("作品上传表单在统一右侧抽屉中完整呈现", async ({ page }) => {
  await page.goto("/works");
  await page.getByRole("button", { name: "上传作品" }).click();

  const drawer = page.locator(".ant-drawer");
  await expect(drawer).toBeVisible();
  await expect(drawer.getByText("作品图片", { exact: true })).toBeVisible();
  await expect(drawer.getByText("选择作者", { exact: true })).toBeVisible();
  await expect(drawer.getByText("提示词", { exact: true })).toBeVisible();
  await expect(drawer.getByText("模型", { exact: true })).toBeVisible();
  await expect(drawer.getByText("画面比例", { exact: true })).toBeVisible();
  await expect(drawer.getByText("图片精度", { exact: true })).toBeVisible();
  await expect(drawer.getByText("作品风格", { exact: true })).toBeVisible();
  await expect(drawer.getByText("作品标签", { exact: true })).toBeVisible();
  await expect(drawer.locator('input[type="file"]')).toHaveAttribute("accept", "image/png,image/jpeg,image/webp,image/gif");
  await expect(drawer.getByRole("button", { name: "立即发布" })).toBeVisible();
});

test("玩法、风格和 API 平台编辑交互使用统一抽屉", async ({ page }) => {
  await page.goto("/operations/gameplays");
  await page.getByRole("button", { name: "编辑" }).first().click();
  await expect(page.locator(".ant-drawer").getByText("玩法封面", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "关闭" }).click();

  await page.goto("/operations/styles");
  await page.getByRole("button", { name: "编辑" }).first().click();
  await expect(page.locator(".ant-drawer").getByText("封面图", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "关闭" }).click();

  await page.goto("/operations/providers");
  await expect(page.locator(".lumi-provider-name-cell").filter({ hasText: "Ainb" })).toBeVisible();
  await page.getByRole("button", { name: "新增 API 平台" }).click();
  const drawer = page.locator(".ant-drawer");
  await expect(drawer.getByText("接口类型", { exact: true })).toBeVisible();
  await expect(drawer.getByText("结果处理方式（是否使用 FC）", { exact: true })).toBeVisible();
  await expect(drawer.getByText("文生图完整接口 URL", { exact: true })).toBeVisible();
  await expect(drawer.getByText("文生图请求参数", { exact: true })).toBeVisible();
  await expect(drawer.getByText("启用图生图", { exact: true })).toBeVisible();
  await expect(drawer.getByRole("button", { name: "添加请求参数" })).toBeVisible();
  await expect(drawer.getByRole("button", { name: "保存" })).toBeVisible();
});

test("主要运营模块均可通过深链接直接打开", async ({ page }) => {
  const routes = [
    ["/dashboard", "数据大屏"],
    ["/reviews", "内容审核"],
    ["/operations/banners", "走马灯"],
    ["/operations/categories", "分类管理"],
    ["/operations/models", "模型管理"],
    ["/operations/qualities", "分辨率配置"],
    ["/finance", "财务概览"],
    ["/finance/transactions", "交易记录"],
    ["/messages/announcements", "弹窗公告"],
    ["/messages/feedback", "用户反馈"],
    ["/settings", "系统设置"],
    ["/settings/agreements", "协议管理"]
  ];

  for (const [route, title] of routes) {
    await page.goto(route);
    await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
    await expect(page.locator(".lumi-admin-v2")).toBeVisible();
  }
});

test("窄屏下保持可用且不会产生页面级横向溢出", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/workbench");

  await expect(page.getByRole("heading", { name: "工作台", exact: true })).toBeVisible();
  await expect(page.getByText("运营工作台", { exact: true })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test("真实数据模式下未登录用户进入统一登录页", async ({ page }) => {
  await page.goto("/workbench?mock=0");

  await expect(page.getByRole("heading", { name: "管理员登录", exact: true })).toBeVisible();
  await expect(page.getByLabel("管理员账号")).toBeVisible();
  await expect(page.getByLabel("登录密码")).toBeVisible();
  await expect(page.getByRole("button", { name: /登\s*录/ })).toBeVisible();
});
