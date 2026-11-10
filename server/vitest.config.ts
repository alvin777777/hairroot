import { defineConfig } from "vitest/config";

// Tests run against a real PostgreSQL database, so test files must not run in parallel.
export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  "postgresql://hairroot:hairroot@localhost:5435/hairroot_test?schema=public";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globalSetup: ["tests/globalSetup.ts"],
    fileParallelism: false,
    env: {
      DATABASE_URL: TEST_DATABASE_URL,
      CLIENT_ORIGIN: "http://localhost:5173",
      NODE_ENV: "test",
    },
  },
});
