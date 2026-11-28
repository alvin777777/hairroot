import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getPrisma } from "../src/prisma.js";
import { api, createUser, loginAs, resetDb } from "./helpers.js";

const HOUR = 60 * 60 * 1000;

describe("F-07 rescheduling", () => {
  let scheduleId: number;
  let alice: string;
  let bob: string;
  let staff: string;

  beforeEach(async () => {
    await resetDb();
    const specialist = await createUser("STAFF", "move-staff@example.test");
    await createUser("CUSTOMER", "move-alice@example.test");
    await createUser("CUSTOMER", "move-bob@example.test");
    scheduleId = (await getPrisma().schedule.create({ data: { name: "Consultation", specialistId: specialist.id } })).id;
    alice = await loginAs("move-alice@example.test");
    bob = await loginAs("move-bob@example.test");
    staff = await loginAs("move-staff@example.test");
  });
  afterEach(() => vi.useRealTimers());

  async function slot(startAt: Date, durationMinutes = 30) {
    return getPrisma().slot.create({ data: {
      scheduleId, startAt, endAt: new Date(startAt.getTime() + durationMinutes * 60_000),
    } });
  }
  async function book(slotId: number, cookie = alice) {
    return api().post("/api/bookings").set("Cookie", cookie).send({ slotId, topic: "Hairline review" });
  }
  const move = (id: number | string, slotId: unknown, cookie = alice) =>
    api().post(`/api/bookings/${id}/reschedule`).set("Cookie", cookie).send({ slotId });

  it("T-46 moves the same row, preserves topic, and updates both availability and schedule", async () => {
    const a = await slot(new Date(Date.now() + 48 * HOUR));
    const b = await slot(new Date(Date.now() + 72 * HOUR));
    const created = await book(a.id);
    const id = created.body.booking.id as number;
    const originalCreatedAt = created.body.booking.createdAt;
    const result = await move(id, b.id);
    expect(result.status).toBe(200);
    expect(result.body.booking).toMatchObject({ id, topic: "Hairline review", status: "ACTIVE", createdAt: originalCreatedAt, slot: { id: b.id } });
    expect(await getPrisma().booking.count({ where: { id } })).toBe(1);
    expect((await api().get("/api/slots/available").set("Cookie", alice)).body.slots.map((s: { id: number }) => s.id)).toContain(a.id);
    expect((await api().get("/api/slots/available").set("Cookie", alice)).body.slots.map((s: { id: number }) => s.id)).not.toContain(b.id);
    expect((await api().get("/api/bookings/mine").set("Cookie", alice)).body.bookings[0].slot.id).toBe(b.id);
    const schedule = await api().get(`/api/schedules/${scheduleId}/slots`).set("Cookie", staff);
    expect(schedule.body.slots.find((s: { id: number }) => s.id === a.id).booking).toBeNull();
    expect(schedule.body.slots.find((s: { id: number }) => s.id === b.id).booking.id).toBe(id);
  });

  it("T-47 allows exactly 24 hours but rejects one millisecond less", async () => {
    const anchor = new Date();
    const a = await slot(new Date(anchor.getTime() + 24 * HOUR));
    const specialistId = (await getPrisma().schedule.findUniqueOrThrow({ where: { id: scheduleId } })).specialistId;
    const secondSchedule = await getPrisma().schedule.create({ data: { name: "Follow-up", specialistId } });
    const b = await getPrisma().slot.create({ data: {
      scheduleId: secondSchedule.id,
      startAt: new Date(anchor.getTime() + 24 * HOUR - 1),
      endAt: new Date(anchor.getTime() + 24 * HOUR - 1 + 30 * 60_000),
    } });
    const target1 = await slot(new Date(anchor.getTime() + 72 * HOUR));
    const target2 = await slot(new Date(anchor.getTime() + 96 * HOUR));
    const first = await book(a.id);
    const second = await book(b.id);
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(anchor);
    expect((await move(first.body.booking.id, target1.id)).status).toBe(200);
    const late = await move(second.body.booking.id, target2.id);
    expect([late.status, late.body.code]).toEqual([422, "RESCHEDULE_CLOSED"]);
    expect((await getPrisma().booking.findUniqueOrThrow({ where: { id: second.body.booking.id } })).slotId).toBe(b.id);
  });

  it("T-48 denies anonymous, staff, another owner, and invalid booking IDs", async () => {
    const a = await slot(new Date(Date.now() + 48 * HOUR));
    const b = await slot(new Date(Date.now() + 72 * HOUR));
    const id = (await book(a.id)).body.booking.id as number;
    expect((await api().post(`/api/bookings/${id}/reschedule`).send({ slotId: b.id })).status).toBe(401);
    expect((await move(id, b.id, staff)).status).toBe(403);
    expect((await move(id, b.id, bob)).status).toBe(404);
    for (const invalid of ["abc", "0", "999999", "2147483648"]) expect((await move(invalid, b.id)).status).toBe(404);
    expect((await getPrisma().booking.findUniqueOrThrow({ where: { id } })).slotId).toBe(a.id);
  });

  it("T-49 rejects taken, past, missing, same and invalid targets, and cancelled bookings", async () => {
    const a = await slot(new Date(Date.now() + 48 * HOUR));
    const taken = await slot(new Date(Date.now() + 72 * HOUR));
    const past = await slot(new Date(Date.now() - HOUR));
    const free = await slot(new Date(Date.now() + 96 * HOUR));
    const id = (await book(a.id)).body.booking.id as number;
    expect((await book(taken.id, bob)).status).toBe(201);
    for (const [target, status, code] of [
      [taken.id, 409, "SLOT_TAKEN"], [past.id, 422, "SLOT_NOT_BOOKABLE"],
      [999999, 404, "NOT_FOUND"], [a.id, 422, "SAME_SLOT"],
      [undefined, 400, "VALIDATION_ERROR"], ["x", 400, "VALIDATION_ERROR"],
      [2_147_483_648, 400, "VALIDATION_ERROR"],
    ] as const) {
      const result = await move(id, target);
      expect([result.status, result.body.code]).toEqual([status, code]);
      expect((await getPrisma().booking.findUniqueOrThrow({ where: { id } })).slotId).toBe(a.id);
    }
    expect((await api().post(`/api/bookings/${id}/cancel`).set("Cookie", alice).send({})).status).toBe(200);
    const cancelled = await move(id, free.id);
    expect([cancelled.status, cancelled.body.code]).toEqual([409, "BOOKING_NOT_ACTIVE"]);
  });

  it("T-50 races moving with booking, two moves, and cancellation", async () => {
    const a = await slot(new Date(Date.now() + 48 * HOUR));
    const b = await slot(new Date(Date.now() + 72 * HOUR));
    const c = await slot(new Date(Date.now() + 96 * HOUR));
    const id = (await book(a.id)).body.booking.id as number;
    const firstRace = await Promise.all([move(id, b.id), book(b.id, bob)]);
    expect(firstRace.filter((r) => r.status >= 200 && r.status < 300)).toHaveLength(1);
    expect(firstRace.filter((r) => r.status === 409)).toHaveLength(1);
    expect(await getPrisma().booking.count({ where: { slotId: b.id, status: "ACTIVE" } })).toBe(1);
    const current = (await getPrisma().booking.findUniqueOrThrow({ where: { id } })).slotId;
    const target1 = current === b.id ? a.id : b.id;
    const target2 = c.id;
    const secondRace = await Promise.all([move(id, target1), move(id, target2)]);
    expect(secondRace.map((r) => r.status).sort()).toEqual([200, 409]);
    const beforeCancelRace = (await getPrisma().booking.findUniqueOrThrow({ where: { id } })).slotId;
    const nextTarget = [a.id, b.id, c.id].find((slotId) => slotId !== beforeCancelRace && slotId !== (firstRace[1].status === 201 ? b.id : -1))!;
    const thirdRace = await Promise.all([
      move(id, nextTarget),
      api().post(`/api/bookings/${id}/cancel`).set("Cookie", alice).send({}),
    ]);
    expect(thirdRace.map((r) => r.status).sort()).toEqual([200, 409]);
    expect(thirdRace.find((r) => r.status === 409)?.body.code).toBe("BOOKING_NOT_ACTIVE");
    const final = await getPrisma().booking.findUniqueOrThrow({ where: { id } });
    expect([final.status, final.slotId]).toEqual(thirdRace[0].status === 200 ? ["ACTIVE", nextTarget] : ["CANCELLED", beforeCancelRace]);
  });

  it("T-51 permits moving to a legacy 15-minute slot", async () => {
    const a = await slot(new Date(Date.now() + 48 * HOUR));
    const legacy = await slot(new Date(Date.now() + 72 * HOUR), 15);
    const id = (await book(a.id)).body.booking.id as number;
    expect((await move(id, legacy.id)).status).toBe(200);
    expect((await getPrisma().slot.findUniqueOrThrow({ where: { id: legacy.id } })).endAt.getTime() - legacy.startAt.getTime()).toBe(15 * 60_000);
  });
});
