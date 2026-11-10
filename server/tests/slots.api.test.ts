import { beforeEach, describe, expect, it } from "vitest";
import { getPrisma } from "../src/prisma.js";
import { api, createUser, loginAs, resetDb } from "./helpers.js";

const DAY = 24 * 60 * 60 * 1000;
const base = new Date(Date.now() + 7 * DAY);
base.setUTCHours(3, 0, 0, 0);
const at = (minutes: number) => new Date(base.getTime() + minutes * 60_000).toISOString();

describe("slot creation", () => {
  let scheduleA: number;
  let scheduleA2: number;
  let scheduleB: number;
  let specialistA: string;
  let specialistB: string;
  const post = (scheduleId: number, cookie: string, startAt: string, endAt: string) =>
    api().post(`/api/schedules/${scheduleId}/slots`).set("Cookie", cookie).send({ startAt, endAt });
  const slotCount = () => getPrisma().slot.count();

  beforeEach(async () => {
    await resetDb();
    const a = await createUser("STAFF", "a@example.test", "Specialist A");
    const b = await createUser("STAFF", "b@example.test", "Specialist B");
    const prisma = getPrisma();
    scheduleA = (await prisma.schedule.create({ data: { name: "A consultation", specialistId: a.id } })).id;
    scheduleA2 = (await prisma.schedule.create({ data: { name: "A follow-up", specialistId: a.id } })).id;
    scheduleB = (await prisma.schedule.create({ data: { name: "B consultation", specialistId: b.id } })).id;
    specialistA = await loginAs("a@example.test");
    specialistB = await loginAs("b@example.test");
  });

  it("lists only the specialist's own schedules", async () => {
    const res = await api().get("/api/schedules/mine").set("Cookie", specialistB);
    expect(res.body.schedules).toEqual([{ id: scheduleB, name: "B consultation" }]);
  });

  it("T-10 creates a valid slot on an assigned schedule (AC-10)", async () => {
    const res = await post(scheduleA, specialistA, at(0), at(30));
    expect(res.status).toBe(201);
    expect(res.body.slot).toMatchObject({ scheduleId: scheduleA, startAt: at(0), endAt: at(30) });
    const stored = await getPrisma().slot.findUniqueOrThrow({ where: { id: res.body.slot.id } });
    expect(stored.startAt.toISOString()).toBe(at(0));
  });

  it("T-11b rejects times outside the limits and stores nothing (AC-11)", async () => {
    const past = new Date(Date.now() - DAY);
    const pastRes = await post(scheduleA, specialistA, past.toISOString(), new Date(past.getTime() + 30 * 60_000).toISOString());
    expect(pastRes.status).toBe(422);
    expect(pastRes.body.code).toBe("SLOT_IN_PAST");

    for (const end of [14, 121, 0, -15]) {
      const res = await post(scheduleA, specialistA, at(0), at(end));
      expect(res.status, `duration ${end}`).toBe(400);
      expect(res.body.fields.endAt).toBeDefined();
    }
    expect(await slotCount()).toBe(0);
  });

  it("T-11b accepts exactly 15 and exactly 120 minutes (AC-11)", async () => {
    expect((await post(scheduleA, specialistA, at(0), at(15))).status).toBe(201);
    expect((await post(scheduleA, specialistA, at(60), at(180))).status).toBe(201);
  });

  it("T-12a rejects an overlapping slot on the same schedule (AC-12)", async () => {
    await post(scheduleA, specialistA, at(0), at(60));
    const res = await post(scheduleA, specialistA, at(30), at(90));
    expect(res.status).toBe(409);
    expect(res.body.code).toBe("SLOT_OVERLAP");
    expect(await slotCount()).toBe(1);
  });

  it("T-12b accepts an adjacent slot and the same time on another schedule (AC-12)", async () => {
    await post(scheduleA, specialistA, at(0), at(60));
    expect((await post(scheduleA, specialistA, at(60), at(90))).status).toBe(201);
    expect((await post(scheduleA2, specialistA, at(0), at(60))).status).toBe(201);
  });

  it("T-12c lets only one of several competing overlapping requests succeed (AC-12)", async () => {
    const results = await Promise.all(Array.from({ length: 8 }, () => post(scheduleA, specialistA, at(0), at(60))));
    const statuses = results.map((r) => r.status).sort();
    expect(statuses).toEqual([201, 409, 409, 409, 409, 409, 409, 409]);
    expect(await slotCount()).toBe(1);
  });

  it("T-13 rejects a specialist creating a slot on another specialist's schedule (AC-13)", async () => {
    const res = await post(scheduleA, specialistB, at(0), at(30));
    expect(res.status).toBe(403);
    expect(res.body.code).toBe("FORBIDDEN");
    expect(await slotCount()).toBe(0);
  });
});
