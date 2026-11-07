import { beforeEach, describe, expect, it } from "vitest";
import { getPrisma } from "../src/prisma.js";
import { hashToken } from "../src/services/session.js";
import { PASSWORD, api, cookieFrom, createUser, loginAs, resetDb } from "./helpers.js";

const STUDENT = "student@example.test";
const ADVISOR = "advisor@example.test";

describe("authentication", () => {
  beforeEach(async () => {
    await resetDb();
    await createUser("CUSTOMER", STUDENT, "Student One");
    await createUser("STAFF", ADVISOR, "Advisor One");
  });

  it("T-01 logs in with valid credentials and sets a session cookie (AC-01)", async () => {
    const res = await api().post("/api/auth/login").send({ email: STUDENT, password: PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ email: STUDENT, name: "Student One", role: "CUSTOMER" });
    expect(cookieFrom(res)).toMatch(/^advisorbook_session=/);
  });

  it("T-02 answers a wrong password and an unknown email identically (AC-02)", async () => {
    const wrong = await api().post("/api/auth/login").send({ email: STUDENT, password: "Wrong-Pass1" });
    const unknown = await api().post("/api/auth/login").send({ email: "nobody@example.test", password: PASSWORD });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body).toEqual(unknown.body);
    expect(wrong.body.code).toBe("INVALID_CREDENTIALS");
    expect(wrong.headers["set-cookie"]).toBeUndefined();
    expect(unknown.headers["set-cookie"]).toBeUndefined();
  });

  it("rejects a login missing required fields with 400", async () => {
    const res = await api().post("/api/auth/login").send({ email: STUDENT });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("VALIDATION_ERROR");
    expect(res.body.fields.password).toBeDefined();
  });

  it("T-03 invalidates the session on logout (AC-03)", async () => {
    const cookie = await loginAs(STUDENT);
    expect((await api().get("/api/auth/me").set("Cookie", cookie)).status).toBe(200);
    expect((await api().post("/api/auth/logout").set("Cookie", cookie)).status).toBe(204);
    expect((await api().get("/api/auth/me").set("Cookie", cookie)).status).toBe(401);
    expect(await getPrisma().session.count()).toBe(0);
  });

  it("T-04 returns the identity and role of each session's user (AC-04)", async () => {
    const student = await api().get("/api/auth/me").set("Cookie", await loginAs(STUDENT));
    const advisor = await api().get("/api/auth/me").set("Cookie", await loginAs(ADVISOR));
    expect(student.body.user).toMatchObject({ email: STUDENT, role: "CUSTOMER" });
    expect(advisor.body.user).toMatchObject({ email: ADVISOR, role: "STAFF" });
  });

  it("T-07b never returns a password hash and stores only scrypt hashes (AC-07)", async () => {
    const login = await api().post("/api/auth/login").send({ email: STUDENT, password: PASSWORD });
    const me = await api().get("/api/auth/me").set("Cookie", cookieFrom(login));
    expect(JSON.stringify(login.body)).not.toMatch(/passwordHash|scrypt/);
    expect(JSON.stringify(me.body)).not.toMatch(/passwordHash|scrypt/);
    const stored = await getPrisma().user.findUniqueOrThrow({ where: { email: STUDENT } });
    expect(stored.passwordHash).toMatch(/^scrypt\$/);
    expect(stored.passwordHash).not.toContain(PASSWORD);
  });

  it("T-08 issues an httpOnly cookie for at most 8 hours and rejects expired sessions (AC-08)", async () => {
    const login = await api().post("/api/auth/login").send({ email: STUDENT, password: PASSWORD });
    const raw = (login.headers["set-cookie"] as unknown as string[])[0];
    expect(raw).toMatch(/HttpOnly/i);
    const maxAge = Number(/Max-Age=(\d+)/i.exec(raw)?.[1]);
    expect(maxAge).toBeGreaterThan(0);
    expect(maxAge).toBeLessThanOrEqual(8 * 60 * 60);

    const cookie = cookieFrom(login);
    const token = cookie.split("=")[1];
    await getPrisma().session.update({
      where: { tokenHash: hashToken(token) },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    expect((await api().get("/api/auth/me").set("Cookie", cookie)).status).toBe(401);
  });

  it("rejects a state-changing request from a foreign origin", async () => {
    const { default: request } = await import("supertest");
    const { app } = await import("../src/app.js");
    const res = await request(app)
      .post("/api/auth/login")
      .set("Origin", "http://evil.example")
      .send({ email: STUDENT, password: PASSWORD });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe("CSRF_REJECTED");
  });
});
