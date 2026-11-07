import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as api from "../src/api.js";
import MyBookings from "../src/pages/MyBookings.js";
import SchedulePage from "../src/pages/SchedulePage.js";
import SlotsPage from "../src/pages/SlotsPage.js";

const pending = () => new Promise<never>(() => {});
const failing = () => Promise.reject(new Error("Server unavailable"));
const show = (ui: JSX.Element) => render(<MemoryRouter>{ui}</MemoryRouter>);
afterEach(() => vi.restoreAllMocks());

describe("T-26 data screen states (AC-26)", () => {
  it("slot list shows loading, empty, and error states", async () => {
    const spy = vi.spyOn(api, "getAvailableSlots").mockImplementation(pending);
    const first = show(<SlotsPage />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading available times");
    first.unmount();

    spy.mockResolvedValue({ slots: [] });
    const second = show(<SlotsPage />);
    expect(await screen.findByText(/No times are available/)).toBeInTheDocument();
    second.unmount();

    spy.mockImplementation(failing);
    show(<SlotsPage />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Server unavailable");
  });

  it("booking list shows loading, empty, and error states", async () => {
    const spy = vi.spyOn(api, "getMyBookings").mockImplementation(pending);
    const first = show(<MyBookings />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading your bookings");
    first.unmount();

    spy.mockResolvedValue({ bookings: [] });
    const second = show(<MyBookings />);
    expect(await screen.findByText(/You have no bookings yet/)).toBeInTheDocument();
    second.unmount();

    spy.mockImplementation(failing);
    show(<MyBookings />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Server unavailable");
  });

  it("schedule screen shows loading, empty, and error states", async () => {
    const schedules = vi.spyOn(api, "getMySchedules").mockImplementation(pending);
    const slots = vi.spyOn(api, "getScheduleSlots");
    const first = show(<SchedulePage />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading schedules");
    first.unmount();

    schedules.mockResolvedValue({ schedules: [{ id: 1, name: "Office hours" }] });
    slots.mockResolvedValue({ slots: [] });
    const second = show(<SchedulePage />);
    expect(await screen.findByText(/No slots on this schedule yet/)).toBeInTheDocument();
    second.unmount();

    slots.mockImplementation(failing);
    show(<SchedulePage />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Server unavailable");
  });
});
