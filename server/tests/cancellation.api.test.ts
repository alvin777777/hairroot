import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getPrisma } from "../src/prisma.js";
import { api, createUser, loginAs, resetDb } from "./helpers.js";

const HOUR = 60 * 60 * 1000;

describe("F-06 customer cancellation", () => {
  let scheduleId: number;
  let alice: string;
  let bob: string;
  let staff: string;

  beforeEach(async () => {
    await resetDb();
    const specialist = await createUser("STAFF", "cancel-staff@example.test");
    await createUser("CUSTOMER", "cancel-alice@example.test");
    await createUser("CUSTOMER", "cancel-bob@example.test");
    scheduleId = (await getPrisma().schedule.create({ data: { name: "Consultation", specialistId: specialist.id } })).id;
    alice = await loginAs("cancel-alice@example.test");
    bob = await loginAs("cancel-bob@example.test");
    staff = await loginAs("cancel-staff@example.test");
  });
  afterEach(() => vi.useRealTimers());

  async function makeBooking(startAt: Date, targetScheduleId = scheduleId) {
    const slot = await getPrisma().slot.create({
      data: { scheduleId: targetScheduleId, startAt, endAt: new Date(startAt.getTime() + 30 * 60_000) },
    });
    const response = await api().post("/api/bookings").set("Cookie", alice)
      .send({ slotId: slot.id, topic: "Hairline review" });
    expect(response.status).toBe(201);
    return { id: response.body.booking.id as number, slotId: slot.id };
  }

  const cancel = (id: number, cookie: string) =>
    api().post(`/api/bookings/${id}/cancel`).set("Cookie", cookie).send({});

  it("T-40 cancels and retains the row, reopens the slot, and lets another customer book it (AC-35)", async () => {
    const { id, slotId } = await makeBooking(new Date(Date.now() + 48 * HOUR));
    const result = await cancel(id, alice);
    expect(result.status).toBe(200);
    expect(result.body.booking).toMatchObject({ id, status: "CANCELLED", topic: "Hairline review" });
    expect(await getPrisma().booking.findUniqueOrThrow({ where: { id } })).toMatchObject({ id, slotId, status: "CANCELLED" });
    expect((await api().get(`/api/bookings/${id}`).set("Cookie", alice)).body.booking.status).toBe("CANCELLED");
    expect((await api().get("/api/bookings/mine").set("Cookie", alice)).body.bookings).toEqual([
      expect.objectContaining({ id, status: "CANCELLED" }),
    ]);
    expect((await api().get("/api/slots/available").set("Cookie", bob)).body.slots.map((s: { id: number }) => s.id)).toContain(slotId);
    expect((await api().post("/api/bookings").set("Cookie", bob).send({ slotId, topic: "New visit" })).status).toBe(201);
    expect(await getPrisma().booking.count({ where: { slotId, status: "ACTIVE" } })).toBe(1);
  });

  it("T-41 permits exactly 24 hours and rejects one millisecond later (AC-36)", async () => {
    // Keep the clock inside the session lifetime while exercising the cutoff.
    const anchor = new Date();
    const atLimit = await makeBooking(new Date(anchor.getTime() + 24 * HOUR));
    const currentSchedule = await getPrisma().schedule.findUniqueOrThrow({ where: { id: scheduleId } });
    const otherSchedule = await getPrisma().schedule.create({
      data: { name: "Follow-up", specialistId: currentSchedule.specialistId },
    });
    const tooLate = await makeBooking(new Date(anchor.getTime() + 24 * HOUR - 1), otherSchedule.id);
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(anchor);
    expect((await cancel(atLimit.id, alice)).status).toBe(200);
    const rejected = await cancel(tooLate.id, alice);
    expect(rejected.status).toBe(422);
    expect(rejected.body.code).toBe("CANCELLATION_CLOSED");
    expect((await getPrisma().booking.findUniqueOrThrow({ where: { id: tooLate.id } })).status).toBe("ACTIVE");
  });

  it("T-42 denies anonymous, staff and another customer without changing the row (AC-37)", async () => {
    const { id } = await makeBooking(new Date(Date.now() + 48 * HOUR));
    expect((await api().post(`/api/bookings/${id}/cancel`).send({})).status).toBe(401);
    expect((await cancel(id, staff)).status).toBe(403);
    expect((await cancel(id, bob)).status).toBe(404);
    expect((await getPrisma().booking.findUniqueOrThrow({ where: { id } })).status).toBe("ACTIVE");
  });

  it("T-43 reports only one success under concurrent cancellation and rejects a repeat (AC-38)", async () => {
    const { id } = await makeBooking(new Date(Date.now() + 48 * HOUR));
    const responses = await Promise.all([cancel(id, alice), cancel(id, alice)]);
    expect(responses.map((r) => r.status).sort()).toEqual([200, 409]);
    expect((await cancel(id, alice)).body.code).toBe("BOOKING_NOT_ACTIVE");
    expect((await getPrisma().booking.findUniqueOrThrow({ where: { id } })).status).toBe("CANCELLED");
  });
});
