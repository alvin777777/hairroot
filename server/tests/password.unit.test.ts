import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "../src/services/password.js";

describe("password hashing", () => {
  it("T-07a salts each hash and verifies only the correct password (AC-07)", async () => {
    const first = await hashPassword("Password123!");
    const second = await hashPassword("Password123!");
    expect(first).toMatch(/^scrypt\$/);
    expect(first).not.toBe(second);
    expect(first).not.toContain("Password123!");
    expect(await verifyPassword("Password123!", first)).toBe(true);
    expect(await verifyPassword("wrong-password", first)).toBe(false);
  });
});
