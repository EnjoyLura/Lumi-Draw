import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/ui",
  // 管理后台含多张图片和按需加载的桌面组件；限制本地并发可避免 Vite 静态服务被并发浏览器抢占。
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 2,
  reporter: [["list"]],
  use: {
    trace: "retain-on-failure"
  },
  projects: [
    {
      name: "mobile-h5",
      testMatch: /mobile-h5\.spec\.mjs/,
      use: {
        ...devices["Pixel 7"],
        baseURL: "http://127.0.0.1:4173"
      }
    },
    {
      name: "admin",
      testMatch: /admin\.spec\.mjs/,
      use: {
        ...devices["Desktop Chrome"],
        baseURL: "http://127.0.0.1:4174"
      }
    }
  ],
  webServer: [
    {
      command: "node scripts/serve-static.mjs apps/mobile/dist/build/h5 4173",
      url: "http://127.0.0.1:4173",
      reuseExistingServer: !process.env.CI
    },
    {
      command: "node scripts/serve-static.mjs apps/admin/dist 4174",
      url: "http://127.0.0.1:4174",
      reuseExistingServer: !process.env.CI
    }
  ]
});
