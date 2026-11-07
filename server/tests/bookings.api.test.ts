import { beforeEach, describe, expect, it } from "vitest";
import { getPrisma } from "../src/prisma.js";
import { api, createUser, loginAs, resetDb } from "./helpers.js";

const HOUR = 60 * 60 * 1000;

describe("booking", () => {
  let scheduleId: number;
  let alice: string;
  let bob: string;
  let aliceId: number;
  let bobId: number;

  const slot = (hoursFromNow: number) => {
    const startAt = new Date(Date.now() + hoursFromNow * HOUR);
    return getPrisma().slot.create({ data: { scheduleId, startAt, endAt: new Date(startAt.getTime() + HOUR / 2) } });
  };
  const book = (cookie: string, slotId: number, topic = "Course planning") =>
    api().post("/api/bookings").set("Cookie", cookie).send({ slotId, topic });
  const activeRows = (slotId: number) => getPrisma().booking.count({ where: { slotId, status: "ACTIVE" } });

  beforeEach(async () => {
    await resetDb();
    const advisor = await createUser("STAFF", "advisor@example.test", "Dr. Advisor");
    aliceId = (await createUser("CUSTOMER", "alice@example.test", "Alice")).id;
    bobId = (await createUser("CUSTOMER", "bob@example.test", "Bob")).id;
    scheduleId = (await getPrisma().schedule.create({ data: { name: "Office hours", advisorId: advisor.id } })).id;
    alice = await loginAs("alice@example.test");
    bob = await loginAs("bob@example.test");
  });

  it("T-14 lists only future unbooked slots with no student information (AC-14)", async () => {
    const free = await slot(24);
    const booked = await slot(48);
    await slot(-24);
    await getPrisma().booking.create({ data: { slotId: booked.id, customerId: bobId, topic: "Private topic" } });

    const res = await api().get("/api/slots/available").set("Cookie", alice);
    expect(res.status).toBe(200);
    expect(res.body.slots.map((s: { id: number }) => s.id)).toEqual([free.id]);
    expect(res.body.slots[0]).toMatchObject({ scheduleName: "Office hours", advisorName: "Dr. Advisor" });
    const body = JSON.stringify(res.body);
    expect(body).not.toContain("Bob");
    expect(body).not.toContain("Private topic");
    expect(body).not.toContain("customerId");
  });

  it("T-15 books an available slot for the session's student (AC-15)", async () => {
    const free = await slot(24);
    const res = await book(alice, free.id);
    expect(res.status).toBe(201);
    expect(res.body.booking).toMatchObject({ status: "ACTIVE", topic: "Course planning" });
    expect(res.body.booking.slot.id).toBe(free.id);
    const stored = await getPrisma().booking.findUniqueOrThrow({ where: { id: res.body.booking.id } });
    expect(stored).toMatchObject({ customerId: aliceId, slotId: free.id, status: "ACTIVE" });
  });

  it("T-15b enforces the topic length after trimming (AC-15b)", async () => {
    const rejected = await slot(24);
    for (const topic of ["  ab  ", "x".repeat(201), "", "     "]) {
      const res = await book(alice, rejected.id, topic);
      expect(res.status, `topic of length ${topic.length}`).toBe(400);
      expect(res.body.fields.topic).toBeDefined();
    }
    expect(await activeRows(rejected.id)).toBe(0);

    const three = await book(alice, rejected.id, "  abc  ");
    expect(three.status).toBe(201);
    expect(three.body.booking.topic).toBe("abc");
    expect((await book(alice, (await slot(48)).id, "y".repeat(200))).status).toBe(201);
  });

  it("rejects a booking with a missing or unknown slot", async () => {
    const missing = await api().post("/api/bookings").set("Cookie", alice).send({ topic: "Course planning" });
    expect(missing.status).toBe(400);
    expect(missing.body.fields.slotId).toBeDefined();
    const unknown = await book(alice, 999999);
    expect(unknown.status).toBe(404);
    expect(unknown.body.code).toBe("NOT_FOUND");
  });

  it("T-16 rejects booking an occupied slot and keeps the original booking (AC-16)", async () => {
    const free = await slot(24);
    const first = await book(alice, free.id, "Alice's topic");
    const second = await book(bob, free.id, "Bob's topic");
    expect(second.status).toBe(409);
    expect(second.body.code).toBe("SLOT_TAKEN");
    const rows = await getPrisma().booking.findMany({ where: { slotId: free.id } });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: first.body.booking.id, customerId: aliceId, topic: "Alice's topic" });
  });

  it("T-17 lets exactly one of 20 competing students book the slot (AC-17)", async () => {
    const free = await slot(24);
    const cookies = await Promise.all(
      Array.from({ length: 20 }, async (_, i) => {
        const email = `competitor${i}@example.test`;
        await createUser("CUSTOMER", email);
        return loginAs(email);
      })
    );
    const results = await Promise.all(cookies.map((cookie) => book(cookie, free.id)));
    const statuses = results.map((r) => r.status);
    expect(statuses.filter((s) => s === 201)).toHaveLength(1);
    expect(statuses.filter((s) => s === 409)).toHaveLength(19);
    expect(await activeRows(free.id)).toBe(1);
  }, 30_000);

  it("T-18 rejects booking a slot whose start has passed (AC-18)", async () => {
    const past = await slot(-1);
    const res = await book(alice, past.id);
    expect(res.status).toBe(422);
    expect(res.body.code).toBe("SLOT_NOT_BOOKABLE");
    expect(await activeRows(past.id)).toBe(0);
  });

  it("T-19 ignores a client-supplied customerId (AC-19)", async () => {
    const free = await slot(24);
    const res = await api().post("/api/bookings").set("Cookie", alice)
      .send({ slotId: free.id, topic: "Course planning", customerId: bobId });
    expect(res.status).toBe(201);
    const stored = await getPrisma().booking.findUniqueOrThrow({ where: { id: res.body.booking.id } });
    expect(stored.customerId).toBe(aliceId);
  });
});
