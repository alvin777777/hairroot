import { PrismaClient, type UserRole } from "@prisma/client";
import { hashPassword } from "../src/services/password.js";

// Synthetic local demo data only. Running this resets the database to a known state.
const prisma = new PrismaClient();
export const DEMO_PASSWORD = "Password123!";

const USERS: { email: string; name: string; role: UserRole }[] = [
  { email: "advisor.somchai@advisorbook.test", name: "Dr. Somchai Prasert", role: "STAFF" },
  { email: "advisor.nida@advisorbook.test", name: "Dr. Nida Wongsa", role: "STAFF" },
  { email: "student.anan@advisorbook.test", name: "Anan Suksan", role: "CUSTOMER" },
  { email: "student.mali@advisorbook.test", name: "Mali Rattana", role: "CUSTOMER" },
  { email: "student.krit@advisorbook.test", name: "Krit Boonmee", role: "CUSTOMER" },
];

async function main() {
  await prisma.schedule.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
  const passwordHash = await hashPassword(DEMO_PASSWORD);
  for (const user of USERS) await prisma.user.create({ data: { ...user, passwordHash } });
  console.log(`Seeded ${USERS.length} users. Demo password: ${DEMO_PASSWORD}`);
}

main().finally(() => prisma.$disconnect());
