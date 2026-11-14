import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { E2E_DEMO_PASSWORD } from "./demo-password.js";

const serverDirectory = fileURLToPath(new URL("../server/", import.meta.url));
const databaseUrl = process.env.E2E_DATABASE_URL ??
  "postgresql://hairroot:hairroot@localhost:5435/hairroot_test?schema=public";

export default function globalSetup() {
  const env = { ...process.env, DATABASE_URL: databaseUrl, SEED_DEMO_PASSWORD: E2E_DEMO_PASSWORD, SEED_RESET: "true" };
  execSync("npx prisma migrate deploy", { cwd: serverDirectory, env, stdio: "inherit" });
  execSync("npm run db:seed", { cwd: serverDirectory, env, stdio: "inherit" });
}
