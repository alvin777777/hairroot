import { describe, expect, it } from "vitest";
import { validateSlotRule } from "../src/services/slots.js";

const NOW = new Date("2026-12-01T03:00:00Z");
const at = (minutes: number) => new Date(NOW.getTime() + minutes * 60_000);

describe("slot rule (BR-03)", () => {
  it("T-11a accepts 15 and 120 minutes and rejects values outside the limits (AC-11)", () => {
    expect(validateSlotRule(at(60), at(75), NOW)).toBeNull();
    expect(validateSlotRule(at(60), at(180), NOW)).toBeNull();
    expect(validateSlotRule(at(60), at(74), NOW)).toBe("DURATION");
    expect(validateSlotRule(at(60), at(181), NOW)).toBe("DURATION");
    expect(validateSlotRule(at(60), at(60), NOW)).toBe("DURATION");
    expect(validateSlotRule(at(60), at(30), NOW)).toBe("DURATION");
  });

  it("T-11a rejects a start at or before the current time (AC-11)", () => {
    expect(validateSlotRule(at(0), at(30), NOW)).toBe("PAST");
    expect(validateSlotRule(at(-30), at(0), NOW)).toBe("PAST");
    expect(validateSlotRule(at(1), at(31), NOW)).toBeNull();
  });
});
