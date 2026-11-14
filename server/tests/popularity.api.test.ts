import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { getPrisma } from "../src/prisma.js";
import { api, createUser, resetDb } from "./helpers.js";

const FIXED_NOW = new Date("2026-11-14T03:00:00.000Z"); // 10:00 in Asia/Bangkok
const DAY = 24 * 60 * 60 * 1000;
const todayStart = new Date("2026-11-13T17:00:00.000Z");

describe("public booking popularity", () => {
  beforeAll(async () => {
    // F-16 specifies excluding cancelled bookings, while Sprint 1 has no cancellation feature yet.
    // Add this value only to the isolated hairroot_test database to exercise that filter.
    await getPrisma().$executeRawUnsafe('ALTER TYPE "BookingStatus" ADD VALUE IF NOT EXISTS \'CANCELLED\'');
  });
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(FIXED_NOW);
    await resetDb();
  });
  afterEach(() => vi.useRealTimers());

  it("T-33 returns seven Bangkok dates and counts only future active bookings inside the window (AC-29)", async () => {
    const prisma = getPrisma();
    const staff = await createUser("STAFF", "staff@example.test");
    const customer = await createUser("CUSTOMER", "customer@example.test");
    const schedule = await prisma.schedule.create({ data: { name: "Consultation", specialistId: staff.id } });

    async function bookAt(startAt: Date, status: "ACTIVE" | "CANCELLED" = "ACTIVE") {
      const slot = await prisma.slot.create({
        data: { scheduleId: schedule.id, startAt, endAt: new Date(startAt.getTime() + 30 * 60 * 1000) },
      });
      const booking = await prisma.booking.create({
        data: { slotId: slot.id, customerId: customer.id, topic: "Private topic" },
      });
      if (status === "CANCELLED") {
        await prisma.$executeRaw`UPDATE "Booking" SET status = 'CANCELLED'::"BookingStatus" WHERE id = ${booking.id}`;
      }
    }

    await bookAt(new Date(todayStart.getTime() + 9 * 60 * 60 * 1000)); // Past today.
    await bookAt(new Date(todayStart.getTime() + 12 * 60 * 60 * 1000)); // Future today.
    await bookAt(new Date(todayStart.getTime() + DAY + 11 * 60 * 60 * 1000)); // Future tomorrow.
    await bookAt(FIXED_NOW); // Exactly now is not after now.
    await bookAt(new Date(todayStart.getTime() + 2 * DAY + 11 * 60 * 60 * 1000), "CANCELLED");
    await bookAt(new Date(todayStart.getTime() + 7 * DAY + 60 * 60 * 1000)); // Outside the seven dates.

    const res = await api().get("/api/public/popularity");

    expect(res.status).toBe(200);
    expect(res.body.days).toEqual([
      { date: "2026-11-14", bookings: 1 },
      { date: "2026-11-15", bookings: 1 },
      { date: "2026-11-16", bookings: 0 },
      { date: "2026-11-17", bookings: 0 },
      { date: "2026-11-18", bookings: 0 },
      { date: "2026-11-19", bookings: 0 },
      { date: "2026-11-20", bookings: 0 },
    ]);
    expect(res.body.totalBookings).toBe(2);
  });

  it("T-34 exposes aggregate date/count fields only to anonymous visitors (AC-30)", async () => {
    const prisma = getPrisma();
    const staff = await createUser("STAFF", "private-staff@example.test", "Private Specialist");
    const customer = await createUser("CUSTOMER", "private-customer@example.test", "Private Customer");
    const schedule = await prisma.schedule.create({ data: { name: "Private Schedule", specialistId: staff.id } });
    const startAt = new Date(todayStart.getTime() + DAY + 11 * 60 * 60 * 1000);
    const slot = await prisma.slot.create({
      data: { scheduleId: schedule.id, startAt, endAt: new Date(startAt.getTime() + 30 * 60 * 1000) },
    });
    await prisma.booking.create({ data: { slotId: slot.id, customerId: customer.id, topic: "Private consultation" } });

    const res = await api().get("/api/public/popularity");

    expect(res.status).toBe(200);
    expect(Object.keys(res.body).sort()).toEqual(["days", "totalBookings"]);
    expect(res.body.days).toHaveLength(7);
    for (const day of res.body.days) expect(Object.keys(day).sort()).toEqual(["bookings", "date"]);
    expect(JSON.stringify(res.body)).not.toMatch(/Private Specialist|Private Customer|Private Schedule|Private consultation|private-(staff|customer)@/);
  });
});
