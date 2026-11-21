import { afterEach, describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../src/app.js";

// Lab 5 #31: Cloud Run serves one service at two URLs, so CLIENT_ORIGIN may list several origins.
const original = process.env.CLIENT_ORIGIN;
afterEach(() => {
  process.env.CLIENT_ORIGIN = original;
});

const login = (origin: string) =>
  request(app).post("/api/auth/login").set("Origin", origin).send({ email: "nobody@example.test", password: "x" });

describe("allowed origins", () => {
  it("accepts every origin in a comma-separated CLIENT_ORIGIN", async () => {
    process.env.CLIENT_ORIGIN = "https://hairroot-abc-as.a.run.app, https://hairroot-123.asia-southeast1.run.app";
    for (const origin of ["https://hairroot-abc-as.a.run.app", "https://hairroot-123.asia-southeast1.run.app"]) {
      const res = await login(origin);
      expect(res.status, origin).toBe(401);
      expect(res.headers["access-control-allow-origin"]).toBe(origin);
    }
  });

  it("still rejects an origin that is not listed", async () => {
    process.env.CLIENT_ORIGIN = "https://hairroot-abc-as.a.run.app,https://hairroot-123.asia-southeast1.run.app";
    const res = await login("https://evil.example");
    expect(res.status).toBe(403);
    expect(res.body.code).toBe("CSRF_REJECTED");
    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
  });
});
