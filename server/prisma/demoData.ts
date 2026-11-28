import type { PrismaClient, UserRole } from "@prisma/client";
import { hashPassword } from "../src/services/password.js";

// Synthetic demo data for local work, tests, and the Lab 6 partner team. The password always comes
// from the environment (SEED_DEMO_PASSWORD) and is never printed.
export interface SeedOptions {
  password: string;
  reset: boolean;
}

export function resolveSeedOptions(env: Record<string, string | undefined>): SeedOptions {
  const password = env.SEED_DEMO_PASSWORD ?? "";
  if (!password) throw new Error("SEED_DEMO_PASSWORD must be set to seed the demo accounts.");
  const reset = env.SEED_RESET === "true";
  if (reset && env.NODE_ENV === "production") {
    throw new Error("SEED_RESET deletes all data and is refused in production.");
  }
  return { password, reset };
}

const USERS: { email: string; name: string; role: UserRole }[] = [
  { email: "specialist.somchai@hairroot.test", name: "Dr. Somchai Prasert", role: "STAFF" },
  { email: "specialist.nida@hairroot.test", name: "Dr. Nida Wongsa", role: "STAFF" },
  { email: "customer.anan@hairroot.test", name: "Anan Suksan", role: "CUSTOMER" },
  { email: "customer.mali@hairroot.test", name: "Mali Rattana", role: "CUSTOMER" },
  { email: "customer.krit@hairroot.test", name: "Krit Boonmee", role: "CUSTOMER" },
];

const SCHEDULES = [
  { name: "Hair transplant consultation", specialist: "specialist.somchai@hairroot.test", hours: [0, 1, 2] },
  { name: "Post-procedure follow-up", specialist: "specialist.somchai@hairroot.test", hours: [5] },
  { name: "Hair transplant consultation", specialist: "specialist.nida@hairroot.test", hours: [4, 5, 6] },
];

const HOUR = 60 * 60 * 1000;

export async function seedDemo(prisma: PrismaClient, options: SeedOptions, now = new Date()): Promise<void> {
  if (options.reset) {
    await prisma.booking.deleteMany();
    await prisma.schedule.deleteMany();
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
  }

  const passwordHash = await hashPassword(options.password);
  const ids = new Map<string, number>();
  for (const user of USERS) {
    const saved = await prisma.user.upsert({
      where: { email: user.email },
      update: { name: user.name, role: user.role, passwordHash },
      create: { ...user, passwordHash },
    });
    ids.set(user.email, saved.id);
  }

  // Times for the next seven days from 09:00 Bangkok. Existing slots and bookings are never removed,
  // so a rerun only adds times that are missing.
  const firstMorning = new Date(now);
  firstMorning.setUTCHours(2, 0, 0, 0);
  for (const plan of SCHEDULES) {
    const specialistId = ids.get(plan.specialist)!;
    const schedule =
      (await prisma.schedule.findFirst({ where: { name: plan.name, specialistId } })) ??
      (await prisma.schedule.create({ data: { name: plan.name, specialistId } }));
    for (let day = 1; day <= 7; day++) {
      for (const hour of plan.hours) {
        const startAt = new Date(firstMorning.getTime() + day * 24 * HOUR + hour * HOUR);
        const endAt = new Date(startAt.getTime() + HOUR / 2);
        const clash = await prisma.slot.findFirst({
          where: { scheduleId: schedule.id, startAt: { lt: endAt }, endAt: { gt: startAt } },
          select: { id: true },
        });
        if (!clash) await prisma.slot.create({ data: { scheduleId: schedule.id, startAt, endAt } });
      }
    }
  }
}
