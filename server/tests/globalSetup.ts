import { execSync } from "node:child_process";

const url =
  process.env.TEST_DATABASE_URL ??
  "postgresql://hairroot:hairroot@localhost:5435/hairroot_test?schema=public";

// Bring the test database to the current migration state before any test file runs.
export default function setup() {
  execSync("npx prisma migrate deploy", { stdio: "pipe", env: { ...process.env, DATABASE_URL: url } });
}
