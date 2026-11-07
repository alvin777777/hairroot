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
  await prisma.booking.deleteMany();
  await prisma.schedule.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
  const passwordHash = await hashPassword(DEMO_PASSWORD);
  for (const user of USERS) await prisma.user.create({ data: { ...user, passwordHash } });

  const somchai = await prisma.user.findUniqueOrThrow({ where: { email: "advisor.somchai@advisorbook.test" } });
  const nida = await prisma.user.findUniqueOrThrow({ where: { email: "advisor.nida@advisorbook.test" } });
  const office = await prisma.schedule.create({ data: { name: "Dr. Somchai: Office hours", advisorId: somchai.id } });
  await prisma.schedule.create({ data: { name: "Dr. Somchai: Thesis advising", advisorId: somchai.id } });
  const nidaOffice = await prisma.schedule.create({ data: { name: "Dr. Nida: Office hours", advisorId: nida.id } });

  // Future weekday mornings, computed on each seed so the demo never goes stale.
  const day = new Date();
  day.setUTCHours(2, 0, 0, 0); // 09:00 in Asia/Bangkok
  const hour = 60 * 60 * 1000;
  for (let i = 1; i <= 5; i++) {
    const start = day.getTime() + i * 24 * hour;
    await prisma.slot.create({ data: { scheduleId: office.id, startAt: new Date(start), endAt: new Date(start + hour / 2) } });
    await prisma.slot.create({ data: { scheduleId: nidaOffice.id, startAt: new Date(start + hour), endAt: new Date(start + 1.5 * hour) } });
  }
  console.log(`Seeded ${USERS.length} users. Demo password: ${DEMO_PASSWORD}`);
}

main().finally(() => prisma.$disconnect());
