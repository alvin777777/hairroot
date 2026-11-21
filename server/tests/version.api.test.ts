import { afterEach, describe, expect, it } from "vitest";
import { api } from "./helpers.js";

// Lab 5 #33 (C-06, R-08): anyone can see which commit the running revision serves.
const original = process.env.DEPLOYED_COMMIT_SHA;
afterEach(() => {
  if (original === undefined) delete process.env.DEPLOYED_COMMIT_SHA;
  else process.env.DEPLOYED_COMMIT_SHA = original;
});

describe("GET /api/version", () => {
  it("returns the deployed commit when DEPLOYED_COMMIT_SHA is set", async () => {
    process.env.DEPLOYED_COMMIT_SHA = "0123456789abcdef0123456789abcdef01234567";
    const res = await api().get("/api/version");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ commit: "0123456789abcdef0123456789abcdef01234567" });
  });

  it("returns null outside a deployment", async () => {
    delete process.env.DEPLOYED_COMMIT_SHA;
    const res = await api().get("/api/version");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ commit: null });
  });

  it("does not echo a value that is not a commit SHA", async () => {
    process.env.DEPLOYED_COMMIT_SHA = "<script>alert(1)</script>";
    const res = await api().get("/api/version");
    expect(res.body).toEqual({ commit: null });
  });
});
