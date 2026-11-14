import { afterEach, describe, expect, it, vi } from "vitest";
import { getPrisma } from "../src/prisma.js";
import { api } from "./helpers.js";

describe("health and readiness (Lab 5 #2)", () => {
  afterEach(() => vi.restoreAllMocks());

  it("reports the process is up at /api/health", async () => {
    const res = await api().get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });

  it("reports ready at /api/ready when the database answers", async () => {
    const res = await api().get("/api/ready");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ready" });
  });

  it("answers 503 at /api/ready when the database cannot be reached, without internal details", async () => {
    vi.spyOn(getPrisma(), "$queryRaw").mockRejectedValueOnce(new Error("connect ECONNREFUSED 10.0.0.1:5432"));
    const res = await api().get("/api/ready");
    expect(res.status).toBe(503);
    expect(res.body).toEqual({ status: "unavailable" });
    expect(JSON.stringify(res.body)).not.toContain("ECONNREFUSED");
  });
});
