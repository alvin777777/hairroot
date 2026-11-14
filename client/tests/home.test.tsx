import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import HomePage from "../src/pages/HomePage.js";
import { getBookingPopularity, PopularityDay } from "../src/api.js";

vi.mock("../src/api.js", () => ({ getBookingPopularity: vi.fn() }));
vi.mock("../src/context/AuthContext.js", () => ({ useAuth: () => ({ user: null }) }));

const date = (offset: number) => {
  const d = new Date(Date.UTC(2026, 10, 14 + offset));
  return d.toISOString().slice(0, 10);
};

function response(counts: number[]): { days: PopularityDay[]; totalBookings: number } {
  const days = counts.map((bookings, i) => ({ date: date(i), bookings }));
  return { days, totalBookings: counts.reduce((sum, count) => sum + count, 0) };
}

function renderHome() {
  return render(<MemoryRouter><HomePage /></MemoryRouter>);
}

describe("F-16 public Home", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it.each([
    { counts: [0, 0, 0, 0, 0, 0, 0], visible: 0, total: 0 },
    { counts: [1, 2, 2, 0, 0, 0, 0], visible: 5, total: 5 },
    { counts: [5, 5, 5, 5, 5, 5, 5], visible: 28, total: 35 },
  ])("T-35 renders $visible strands while showing the exact total $total (AC-31)", async ({ counts, visible, total }) => {
    vi.mocked(getBookingPopularity).mockResolvedValue(response(counts));

    renderHome();

    await screen.findByRole("heading", { name: `${total} upcoming ${total === 1 ? "booking" : "bookings"}` });
    expect(screen.getAllByTestId("hair-strand")).toHaveLength(visible);
  });

  it("T-36 shows the earliest busiest date and the empty-state message for zero counts (AC-32)", async () => {
    vi.mocked(getBookingPopularity).mockResolvedValue(response([1, 3, 3, 0, 0, 0, 0]));
    const rendered = renderHome();

    expect(await screen.findByText(/Busiest:/)).toHaveTextContent("Sun 15 Nov");

    rendered.unmount();
    vi.mocked(getBookingPopularity).mockResolvedValue(response([0, 0, 0, 0, 0, 0, 0]));
    renderHome();
    expect(await screen.findByText("No bookings yet")).toBeVisible();
  });

  it("T-36 shows unavailable instead of zero after a failed request, keeping sign-in available (AC-33)", async () => {
    vi.mocked(getBookingPopularity).mockRejectedValue(new Error("offline"));

    renderHome();

    expect(await screen.findByText("This week’s booking activity is temporarily unavailable.")).toBeVisible();
    expect(screen.queryByText("No bookings yet")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/login");
    expect(screen.getByRole("link", { name: "Find a time" })).toHaveAttribute("href", "/login");
  });
});
