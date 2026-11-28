import { expect, test, type Page } from "@playwright/test";
import { E2E_DEMO_PASSWORD } from "../demo-password.js";

const SPECIALIST = "specialist.somchai@hairroot.test";
const CUSTOMER = "customer.anan@hairroot.test";

async function signIn(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(E2E_DEMO_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
}

test("T-53 a moved booking survives reload and updates the specialist schedule", async ({ page }) => {
  const future = new Date(Date.now() + 20 * 24 * 60 * 60 * 1000);
  const local = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(future);
  const dayLabel = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Bangkok", weekday: "short", day: "numeric", month: "short",
  }).format(future);
  const minute = String(Math.floor(Math.random() * 20)).padStart(2, "0");
  const oldTime = `09:${minute}`;
  const newTime = `10:${minute}`;
  const topic = `Move E2E ${Date.now()}`;

  await signIn(page, SPECIALIST);
  await expect(page).toHaveURL(/\/schedule$/);
  for (const time of [oldTime, newTime]) {
    await page.getByLabel("Date").fill(local);
    await page.getByLabel(/Start time/).fill(time);
    await page.getByLabel("Duration").selectOption("30");
    await page.getByRole("button", { name: "Add time" }).click();
    await expect(page.getByText("Time added.", { exact: true })).toBeVisible();
  }
  await page.getByRole("button", { name: "Log out" }).click();

  await signIn(page, CUSTOMER);
  await expect(page).toHaveURL(/\/slots$/);
  await page.getByRole("button", { name: /Hair transplant consultation.*Somchai/ }).click();
  await page.getByRole("group", { name: "Choose a day" }).getByRole("button", { name: dayLabel, exact: true }).click();
  await page.getByRole("group", { name: "Choose a time" }).getByRole("button", { name: oldTime, exact: true }).click();
  await page.getByLabel("What would you like to discuss?").fill(topic);
  await page.getByRole("button", { name: "Confirm booking" }).click();
  await expect(page).toHaveURL(/\/bookings\/\d+$/);
  const detailUrl = page.url();

  await page.getByRole("button", { name: "Change time" }).click();
  const target = page.locator("#reschedule-slot option").filter({ hasText: `${dayLabel}, ${newTime}` });
  const targetId = await target.getAttribute("value");
  expect(targetId).toBeTruthy();
  await page.getByRole("combobox", { name: "Available time" }).selectOption(targetId!);
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Confirm change" }).click();
  await expect(page.getByText(/Booking moved to/)).toBeVisible();
  await expect(page.getByTestId("booking-detail")).toContainText(topic);
  await expect(page.getByTestId("booking-detail")).toContainText(newTime);
  await page.reload();
  await expect(page).toHaveURL(detailUrl);
  await expect(page.getByTestId("booking-detail")).toContainText(newTime);
  await page.getByRole("link", { name: "Back to my bookings" }).click();
  await expect(page.getByTestId("booking").filter({ hasText: topic })).toContainText(newTime);

  await page.getByRole("button", { name: "Log out" }).click();
  await signIn(page, SPECIALIST);
  const oldSlot = page.getByTestId("schedule-slot").filter({ hasText: oldTime });
  const newSlot = page.getByTestId("schedule-slot").filter({ hasText: newTime });
  await expect(oldSlot).toContainText("Available");
  await expect(newSlot).toContainText("Booked");
  await expect(newSlot).toContainText(topic);
});
