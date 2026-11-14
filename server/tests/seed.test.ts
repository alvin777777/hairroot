import { beforeEach, describe, expect, it } from "vitest";
import { getPrisma } from "../src/prisma.js";
import { verifyPassword } from "../src/services/password.js";
import { resolveSeedOptions, seedDemo } from "../prisma/demoData.js";
import { resetDb } from "./helpers.js";

const PASSWORD = "Seed-Test-Pass1";

describe("seed options", () => {
  it("requires the demo password from the environment", () => {
    expect(() => resolveSeedOptions({})).toThrow(/SEED_DEMO_PASSWORD/);
    expect(resolveSeedOptions({ SEED_DEMO_PASSWORD: PASSWORD })).toEqual({ password: PASSWORD, reset: false });
  });

  it("allows a reset only outside production", () => {
    expect(resolveSeedOptions({ SEED_DEMO_PASSWORD: PASSWORD, SEED_RESET: "true" }).reset).toBe(true);
    expect(() => resolveSeedOptions({ SEED_DEMO_PASSWORD: PASSWORD, SEED_RESET: "true", NODE_ENV: "production" })).toThrow(/production/);
  });
});

describe("seedDemo", () => {
  beforeEach(resetDb);

  it("is safe to rerun: it keeps bookings and creates no duplicates", async () => {
    const prisma = getPrisma();
    await seedDemo(prisma, { password: PASSWORD, reset: false });
    const counts = async () => ({
      users: await prisma.user.count(),
      schedules: await prisma.schedule.count(),
      slots: await prisma.slot.count(),
    });
    const first = await counts();
    expect(first.users).toBe(5);
    expect(first.slots).toBeGreaterThan(0);

    const slot = await prisma.slot.findFirstOrThrow({ orderBy: { startAt: "asc" } });
    const customer = await prisma.user.findFirstOrThrow({ where: { role: "CUSTOMER" } });
    const booking = await prisma.booking.create({ data: { slotId: slot.id, customerId: customer.id, topic: "Kept across seeds" } });

    await seedDemo(prisma, { password: PASSWORD, reset: false });
    expect(await counts()).toEqual(first);
    expect(await prisma.booking.findUnique({ where: { id: booking.id } })).not.toBeNull();
  });

  it("stores the demo password only as a hash taken from the options", async () => {
    await seedDemo(getPrisma(), { password: PASSWORD, reset: false });
    const user = await getPrisma().user.findFirstOrThrow();
    expect(user.passwordHash).not.toContain(PASSWORD);
    expect(await verifyPassword(PASSWORD, user.passwordHash)).toBe(true);
  });

  it("wipes existing data when a reset is requested", async () => {
    const prisma = getPrisma();
    await seedDemo(prisma, { password: PASSWORD, reset: false });
    const slot = await prisma.slot.findFirstOrThrow();
    const customer = await prisma.user.findFirstOrThrow({ where: { role: "CUSTOMER" } });
    await prisma.booking.create({ data: { slotId: slot.id, customerId: customer.id, topic: "Removed by reset" } });

    await seedDemo(prisma, { password: PASSWORD, reset: true });
    expect(await prisma.booking.count()).toBe(0);
    expect(await prisma.user.count()).toBe(5);
  });
});
