import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./src",
  testMatch: "**/*.pw.spec.ts",
  workers: 1,

  use: {
    baseURL: "http://127.0.0.1:5173",
    browserName: "chromium",
    viewport: { width: 900, height: 650 },
    screenshot: "only-on-failure",
    trace: "retain-on-failure"
  },

  webServer: {
    command: "npm run dev:game -- --host 127.0.0.1 --port 5173 --strictPort",
    url: "http://127.0.0.1:5173/tests/fixture.html",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000
  }
});
