import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as api from "../src/api.js";
import VersionFooter from "../src/components/VersionFooter.js";

afterEach(() => vi.restoreAllMocks());

describe("VersionFooter (Lab 5 #33)", () => {
  it("shows the short deployed commit", async () => {
    vi.spyOn(api, "getVersion").mockResolvedValue({ commit: "0123456789abcdef0123456789abcdef01234567" });
    render(<VersionFooter />);
    const footer = await screen.findByTestId("app-version");
    expect(footer).toHaveTextContent("Version 0123456");
    expect(footer).toHaveAttribute("title", "0123456789abcdef0123456789abcdef01234567");
  });

  it("shows development when no commit is deployed", async () => {
    vi.spyOn(api, "getVersion").mockResolvedValue({ commit: null });
    render(<VersionFooter />);
    expect(await screen.findByTestId("app-version")).toHaveTextContent("Version development");
  });

  it("shows nothing if the version cannot be loaded", async () => {
    vi.spyOn(api, "getVersion").mockRejectedValue(new Error("offline"));
    render(<VersionFooter />);
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.queryByTestId("app-version")).toBeNull();
  });
});
