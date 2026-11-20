import { existsSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

import { resolveSeedOptions, seedDemo } from "./demoData.js";

// Usage: SEED_DEMO_PASSWORD=... npm run db:seed. Set SEED_RESET=true locally to wipe data first.
// Locally the values come from server/.env. In a container or CI they come from the environment.
if (existsSync(".env")) process.loadEnvFile(".env");

const prisma = new PrismaClient();

async function main() {
  const options = resolveSeedOptions(process.env);
  await seedDemo(prisma, options);
  console.log(`Seeded demo data${options.reset ? " after a reset" : ""}. Demo password not shown.`);
}

main()
  .catch((err: Error) => {
    console.error(err.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
