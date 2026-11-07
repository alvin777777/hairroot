import { beforeEach, describe, expect, it } from "vitest";
import { getPrisma } from "../src/prisma.js";
import { api, createUser, loginAs, resetDb } from "./helpers.js";

const HOUR = 60 * 60 * 1000;

describe("booking views and access control", () => {
  let scheduleA: number;
  let aliceBooking: number;
  let bobBooking: number;
  let bookedSlot: number;
  let freeSlot: number;
  let alice: string;
  let bob: string;
  let advisorA: string;
  let advisorB: string;

  beforeEach(async () => {
    await resetDb();
    const prisma = getPrisma();
    const a = await createUser("STAFF", "a@example.test", "Dr. A");
    await createUser("STAFF", "b@example.test", "Dr. B");
    const aliceId = (await createUser("CUSTOMER", "alice@example.test", "Alice")).id;
    const bobId = (await createUser("CUSTOMER", "bob@example.test", "Bob")).id;
    scheduleA = (await prisma.schedule.create({ data: { name: "A hours", advisorId: a.id } })).id;

    const makeSlot = (hours: number) => {
      const startAt = new Date(Date.now() + hours * HOUR);
      return prisma.slot.create({ data: { scheduleId: scheduleA, startAt, endAt: new Date(startAt.getTime() + HOUR / 2) } });
    };
    bookedSlot = (await makeSlot(24)).id;
    const bobSlot = await makeSlot(48);
    freeSlot = (await makeSlot(72)).id;
    aliceBooking = (await prisma.booking.create({ data: { slotId: bookedSlot, customerId: aliceId, topic: "Alice private topic" } })).id;
    bobBooking = (await prisma.booking.create({ data: { slotId: bobSlot.id, customerId: bobId, topic: "Bob private topic" } })).id;

    alice = await loginAs("alice@example.test");
    bob = await loginAs("bob@example.test");
    advisorA = await loginAs("a@example.test");
    advisorB = await loginAs("b@example.test");
  });

  it("T-20 lists only the student's own bookings and opens one (AC-20)", async () => {
    const list = await api().get("/api/bookings/mine").set("Cookie", alice);
    expect(list.status).toBe(200);
    expect(list.body.bookings.map((b: { id: number }) => b.id)).toEqual([aliceBooking]);
    const detail = await api().get(`/api/bookings/${aliceBooking}`).set("Cookie", alice);
    expect(detail.status).toBe(200);
    expect(detail.body.booking).toMatchObject({ id: aliceBooking, topic: "Alice private topic", status: "ACTIVE" });
  });

  it("T-21 hides another student's booking behind a 404 (AC-21)", async () => {
    const res = await api().get(`/api/bookings/${bobBooking}`).set("Cookie", alice);
    expect(res.status).toBe(404);
    expect(res.body.code).toBe("NOT_FOUND");
    expect(JSON.stringify(res.body)).not.toContain("Bob private topic");
    const missing = await api().get("/api/bookings/999999").set("Cookie", alice);
    expect(missing.body).toEqual(res.body);
    expect(missing.status).toBe(404);
  });

  it("T-22 shows an assigned advisor the schedule's slots and bookings (AC-22)", async () => {
    const res = await api().get(`/api/schedules/${scheduleA}/slots`).set("Cookie", advisorA);
    expect(res.status).toBe(200);
    const booked = res.body.slots.find((s: { id: number }) => s.id === bookedSlot);
    const free = res.body.slots.find((s: { id: number }) => s.id === freeSlot);
    expect(booked.booking).toMatchObject({ topic: "Alice private topic", student: { name: "Alice" } });
    expect(free.booking).toBeNull();
  });

  it("T-23 denies an unassigned advisor a schedule's bookings (AC-23)", async () => {
    const res = await api().get(`/api/schedules/${scheduleA}/slots`).set("Cookie", advisorB);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe("FORBIDDEN");
    expect(JSON.stringify(res.body)).not.toContain("Alice");
  });

  it("T-05 rejects every protected endpoint without a session (AC-05)", async () => {
    const calls = [
      api().get("/api/auth/me"),
      api().get("/api/schedules/mine"),
      api().get(`/api/schedules/${scheduleA}/slots`),
      api().post(`/api/schedules/${scheduleA}/slots`).send({ startAt: "2030-01-01T03:00:00Z", endAt: "2030-01-01T03:30:00Z" }),
      api().get("/api/slots/available"),
      api().post("/api/bookings").send({ slotId: freeSlot, topic: "Anonymous booking" }),
      api().get("/api/bookings/mine"),
      api().get(`/api/bookings/${aliceBooking}`),
    ];
    for (const res of await Promise.all(calls)) {
      expect(res.status, res.request.url).toBe(401);
      expect(res.body).toEqual({ error: "Authentication required.", code: "UNAUTHENTICATED" });
    }
    expect(await getPrisma().booking.count()).toBe(2);
  });

  it("T-06 enforces roles on the backend and changes nothing (AC-06)", async () => {
    const prisma = getPrisma();
    const before = { slots: await prisma.slot.count(), bookings: await prisma.booking.count() };
    const customerOnStaff = [
      api().get("/api/schedules/mine").set("Cookie", bob),
      api().get(`/api/schedules/${scheduleA}/slots`).set("Cookie", bob),
      api().post(`/api/schedules/${scheduleA}/slots`).set("Cookie", bob).send({ startAt: "2030-01-01T03:00:00Z", endAt: "2030-01-01T03:30:00Z" }),
    ];
    const staffOnCustomer = [
      api().get("/api/slots/available").set("Cookie", advisorA),
      api().post("/api/bookings").set("Cookie", advisorA).send({ slotId: freeSlot, topic: "Advisor booking" }),
      api().get("/api/bookings/mine").set("Cookie", advisorA),
      api().get(`/api/bookings/${aliceBooking}`).set("Cookie", advisorA),
    ];
    for (const res of await Promise.all([...customerOnStaff, ...staffOnCustomer])) {
      expect(res.status, res.request.url).toBe(403);
      expect(res.body.code).toBe("FORBIDDEN");
    }
    expect({ slots: await prisma.slot.count(), bookings: await prisma.booking.count() }).toEqual(before);
  });
});
