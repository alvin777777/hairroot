import { describe, expect, it } from "vitest";

describe("temporary CI failure demonstration", () => {
  it("intentionally fails so the main ruleset check can be observed", () => {
    expect(true).toBe(false);
  });
});