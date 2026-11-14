import { PrismaClient, type UserRole } from "@prisma/client";
import { hashPassword } from "../src/services/password.js";

// Synthetic local demo data only. Running this resets the database to a known state.
const prisma = new PrismaClient();
export const DEMO_PASSWORD = "Password123!";

const USERS: { email: string; name: string; role: UserRole }[] = [
  { email: "specialist.somchai@hairroot.test", name: "Dr. Somchai Prasert", role: "STAFF" },
  { email: "specialist.nida@hairroot.test", name: "Dr. Nida Wongsa", role: "STAFF" },
  { email: "customer.anan@hairroot.test", name: "Anan Suksan", role: "CUSTOMER" },
  { email: "customer.mali@hairroot.test", name: "Mali Rattana", role: "CUSTOMER" },
  { email: "customer.krit@hairroot.test", name: "Krit Boonmee", role: "CUSTOMER" },
];

async function main() {
  await prisma.booking.deleteMany();
  await prisma.schedule.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
  const passwordHash = await hashPassword(DEMO_PASSWORD);
  for (const user of USERS) await prisma.user.create({ data: { ...user, passwordHash } });

  const somchai = await prisma.user.findUniqueOrThrow({ where: { email: "specialist.somchai@hairroot.test" } });
  const nida = await prisma.user.findUniqueOrThrow({ where: { email: "specialist.nida@hairroot.test" } });
  const consult = await prisma.schedule.create({ data: { name: "Hair transplant consultation", specialistId: somchai.id } });
  const followUp = await prisma.schedule.create({ data: { name: "Post-procedure follow-up", specialistId: somchai.id } });
  const nidaConsult = await prisma.schedule.create({ data: { name: "Hair transplant consultation", specialistId: nida.id } });

  // Seven days of future times, computed on each seed so the demo never goes stale.
  const day = new Date();
  day.setUTCHours(2, 0, 0, 0); // 09:00 in Asia/Bangkok
  const hour = 60 * 60 * 1000;
  const addSlot = (scheduleId: number, start: number) =>
    prisma.slot.create({ data: { scheduleId, startAt: new Date(start), endAt: new Date(start + hour / 2) } });
  for (let i = 1; i <= 7; i++) {
    const morning = day.getTime() + i * 24 * hour;
    for (const offset of [0, 1, 2]) {
      await addSlot(consult.id, morning + offset * hour);
      await addSlot(nidaConsult.id, morning + (offset + 4) * hour);
    }
    await addSlot(followUp.id, morning + 5 * hour);
  }
  console.log(`Seeded ${USERS.length} users. Demo password: ${DEMO_PASSWORD}`);
}

main().finally(() => prisma.$disconnect());
