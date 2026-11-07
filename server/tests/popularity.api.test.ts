import { beforeEach, describe, expect, it } from "vitest";
import { getPrisma } from "../src/prisma.js";
import { api, createUser, resetDb } from "./helpers.js";

describe("public booking popularity", () => {
  beforeEach(resetDb);

  it("returns anonymous upcoming daily totals without customer or appointment details", async () => {
    const prisma = getPrisma();
    const staff = await createUser("STAFF", "staff@example.test", "Dr. Private Name");
    const customer = await createUser("CUSTOMER", "customer@example.test", "Private Customer");
    const schedule = await prisma.schedule.create({ data: { name: "Private schedule", specialistId: staff.id } });
    const startAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const slot = await prisma.slot.create({
      data: { scheduleId: schedule.id, startAt, endAt: new Date(startAt.getTime() + 30 * 60 * 1000) },
    });
    await prisma.booking.create({ data: { slotId: slot.id, customerId: customer.id, topic: "Private consultation topic" } });

    const res = await api().get("/api/public/popularity");
    expect(res.status).toBe(200);
    expect(res.body.totalBookings).toBe(1);
    expect(res.body.days).toHaveLength(7);
    expect(res.body.days.reduce((sum: number, day: { bookings: number }) => sum + day.bookings, 0)).toBe(1);
    expect(JSON.stringify(res.body)).not.toMatch(/Private Name|Private Customer|Private schedule|Private consultation topic|example\.test/);
  });
});
