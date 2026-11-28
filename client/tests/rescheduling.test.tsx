import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as api from "../src/api.js";
import BookingDetail from "../src/pages/BookingDetail.js";

const active: api.Booking = {
  id: 7, status: "ACTIVE", topic: "Hairline review", createdAt: "2030-01-01T00:00:00.000Z",
  slot: { id: 11, startAt: "2030-12-01T02:00:00.000Z", endAt: "2030-12-01T02:30:00.000Z", scheduleName: "Consultation", specialistName: "Dr. One" },
};
const alternative: api.SlotView = {
  id: 12, startAt: "2030-12-02T02:00:00.000Z", endAt: "2030-12-02T02:30:00.000Z", scheduleName: "Follow-up", specialistName: "Dr. Two",
};

function renderDetail() {
  return render(<MemoryRouter initialEntries={["/bookings/7"]}><Routes><Route path="/bookings/:id" element={<BookingDetail />} /></Routes></MemoryRouter>);
}

afterEach(() => vi.restoreAllMocks());

describe("T-52 rescheduling UI", () => {
  it("shows the action for eligible bookings and hides it for cancelled bookings", async () => {
    vi.spyOn(api, "getBooking").mockResolvedValue({ booking: active });
    renderDetail();
    expect(await screen.findByRole("button", { name: "Change time" })).toBeVisible();
  });

  it("loads alternative slots, confirms before moving, and shows the saved time", async () => {
    vi.spyOn(api, "getBooking").mockResolvedValue({ booking: active });
    vi.spyOn(api, "getAvailableSlots").mockResolvedValue({ slots: [active.slot, alternative] });
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({ ok: true, status: 200, json: async () => ({ booking: { ...active, slot: alternative } }) } as Response);
    vi.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValueOnce(true);
    renderDetail();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Change time" }));
    const picker = await screen.findByRole("combobox", { name: "Available time" });
    expect(screen.queryByRole("option", { name: /Consultation/ })).not.toBeInTheDocument();
    await user.selectOptions(picker, "12");
    await user.click(screen.getByRole("button", { name: "Confirm change" }));
    expect(fetchSpy).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Confirm change" }));
    expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining("/bookings/7/reschedule"), expect.objectContaining({ method: "POST" }));
    expect(await screen.findByText(/Booking moved to/)).toBeVisible();
    expect(screen.getByTestId("booking-detail")).toHaveTextContent("Dr. Two");
  });

  it("keeps the old time and reloads alternatives when the move fails", async () => {
    vi.spyOn(api, "getBooking").mockResolvedValue({ booking: active });
    const slots = vi.spyOn(api, "getAvailableSlots").mockResolvedValue({ slots: [alternative] });
    vi.spyOn(globalThis, "fetch").mockResolvedValue({ ok: false, status: 409, json: async () => ({ code: "SLOT_TAKEN", error: "Another customer has just taken this time." }) } as Response);
    vi.spyOn(window, "confirm").mockReturnValue(true);
    renderDetail();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Change time" }));
    await user.selectOptions(await screen.findByRole("combobox", { name: "Available time" }), "12");
    await user.click(screen.getByRole("button", { name: "Confirm change" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Another customer has just taken this time.");
    expect(screen.getByTestId("booking-detail")).toHaveTextContent("Dr. One");
    expect(slots).toHaveBeenCalledTimes(2);
  });
});
