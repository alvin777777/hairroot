import { PrismaClient } from "@prisma/client";
import { resolveSeedOptions, seedDemo } from "./demoData.js";

// Usage: SEED_DEMO_PASSWORD=... npm run db:seed. Set SEED_RESET=true locally to wipe data first.
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
