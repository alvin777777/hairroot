import { defineConfig } from "@playwright/test";

const e2eDatabaseUrl = process.env.E2E_DATABASE_URL ??
  "postgresql://hairroot:hairroot@localhost:5435/hairroot_test?schema=public";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  timeout: 45_000,
  globalSetup: "./global-setup.ts",
  use: {
    baseURL: "http://localhost:5173",
    browserName: "chromium",
    timezoneId: "Asia/Bangkok",
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "npm run dev",
      cwd: "../server",
      url: "http://localhost:3001/healthz",
      env: { DATABASE_URL: e2eDatabaseUrl },
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: "npm run dev",
      cwd: "../client",
      url: "http://localhost:5173",
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
