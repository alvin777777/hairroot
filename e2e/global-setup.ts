import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const serverDirectory = fileURLToPath(new URL("../server/", import.meta.url));
const databaseUrl = process.env.E2E_DATABASE_URL ??
  "postgresql://hairroot:hairroot@localhost:5435/hairroot_test?schema=public";

export default function globalSetup() {
  const env = { ...process.env, DATABASE_URL: databaseUrl };
  execSync("npx prisma migrate deploy", { cwd: serverDirectory, env, stdio: "inherit" });
  execSync("npm run db:seed", { cwd: serverDirectory, env, stdio: "inherit" });
}
