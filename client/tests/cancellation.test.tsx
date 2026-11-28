import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as api from "../src/api.js";
import BookingDetail from "../src/pages/BookingDetail.js";

const active: api.Booking = {
  id: 7,
  status: "ACTIVE",
  topic: "Hairline review",
  createdAt: "2030-01-01T00:00:00.000Z",
  slot: {
    id: 11,
    startAt: "2030-12-01T02:00:00.000Z",
    endAt: "2030-12-01T02:30:00.000Z",
    scheduleName: "Consultation",
    specialistName: "Dr. One",
  },
};

function renderDetail() {
  return render(
    <MemoryRouter initialEntries={["/bookings/7"]}>
      <Routes><Route path="/bookings/:id" element={<BookingDetail />} /></Routes>
    </MemoryRouter>
  );
}

afterEach(() => vi.restoreAllMocks());

describe("T-44 customer cancellation UI (AC-39)", () => {
  it("asks for confirmation and keeps the booking when the customer declines", async () => {
    vi.spyOn(api, "getBooking").mockResolvedValue({ booking: active });
    const cancel = vi.spyOn(api, "cancelBooking");
    vi.spyOn(window, "confirm").mockReturnValue(false);
    renderDetail();
    await userEvent.setup().click(await screen.findByRole("button", { name: "Cancel booking" }));
    expect(cancel).not.toHaveBeenCalled();
    expect(screen.getByText("Confirmed")).toBeVisible();
  });

  it("shows the saved cancelled status and removes the action after success", async () => {
    vi.spyOn(api, "getBooking").mockResolvedValue({ booking: active });
    const cancel = vi.spyOn(api, "cancelBooking").mockResolvedValue({ booking: { ...active, status: "CANCELLED" } });
    vi.spyOn(window, "confirm").mockReturnValue(true);
    renderDetail();
    await userEvent.setup().click(await screen.findByRole("button", { name: "Cancel booking" }));
    expect(cancel).toHaveBeenCalledWith(7);
    expect(await screen.findByText("Cancelled")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Cancel booking" })).not.toBeInTheDocument();
  });

  it("reports an API failure without claiming cancellation", async () => {
    vi.spyOn(api, "getBooking").mockResolvedValue({ booking: active });
    vi.spyOn(api, "cancelBooking").mockRejectedValue(new api.ApiError(422, {
      code: "CANCELLATION_CLOSED",
      error: "Bookings can be cancelled until 24 hours before the appointment.",
    }));
    vi.spyOn(window, "confirm").mockReturnValue(true);
    renderDetail();
    await userEvent.setup().click(await screen.findByRole("button", { name: "Cancel booking" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Bookings can be cancelled until 24 hours before the appointment.");
    expect(screen.getByText("Confirmed")).toBeVisible();
  });
});
