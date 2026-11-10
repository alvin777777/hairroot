import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as api from "../src/api.js";
import SlotsPage from "../src/pages/SlotsPage.js";

const slot = (id: number, startAt: string, scheduleName: string, specialistName: string) => ({
  id,
  startAt,
  endAt: new Date(new Date(startAt).getTime() + 30 * 60_000).toISOString(),
  scheduleName,
  specialistName,
});

// 09:00 and 10:00 on 1 Dec, 09:00 on 2 Dec, in Asia/Bangkok.
const SLOTS = [
  slot(1, "2030-12-01T02:00:00Z", "Consultation", "Dr. One"),
  slot(2, "2030-12-01T03:00:00Z", "Consultation", "Dr. One"),
  slot(3, "2030-12-02T02:00:00Z", "Consultation", "Dr. One"),
  slot(4, "2030-12-01T07:00:00Z", "Follow-up", "Dr. Two"),
];

afterEach(() => vi.restoreAllMocks());

describe("T-27 guided booking flow (AC-27)", () => {
  it("offers only matching days and times, then books the chosen slot", async () => {
    vi.spyOn(api, "getAvailableSlots").mockResolvedValue({ slots: SLOTS });
    const create = vi.spyOn(api, "createBooking").mockResolvedValue({
      booking: { id: 9, status: "ACTIVE", topic: "Hairline", createdAt: "", slot: SLOTS[1] },
    });
    const user = userEvent.setup();
    render(<MemoryRouter><SlotsPage /></MemoryRouter>);

    await user.click(await screen.findByRole("button", { name: /Consultation.*Dr\. One/ }));

    const days = screen.getByRole("group", { name: "Choose a day" });
    expect(within(days).getAllByRole("button")).toHaveLength(2);
    const times = screen.getByRole("group", { name: "Choose a time" });
    expect(within(times).getAllByRole("button").map((b) => b.textContent)).toEqual(["09:00", "10:00"]);

    await user.click(within(days).getByRole("button", { name: /2 Dec/ }));
    expect(within(screen.getByRole("group", { name: "Choose a time" })).getAllByRole("button").map((b) => b.textContent)).toEqual(["09:00"]);

    await user.click(within(screen.getByRole("group", { name: "Choose a day" })).getByRole("button", { name: /1 Dec/ }));
    await user.click(within(screen.getByRole("group", { name: "Choose a time" })).getByRole("button", { name: "10:00" }));
    await user.type(screen.getByLabelText(/discuss/i), "Hairline");
    await user.click(screen.getByRole("button", { name: "Confirm booking" }));

    expect(create).toHaveBeenCalledWith(2, "Hairline");
  });
});
