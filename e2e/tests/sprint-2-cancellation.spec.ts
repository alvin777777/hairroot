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

test("T-45 cancelled booking survives reload and frees its slot (AC-35, AC-39)", async ({ page }) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const number = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  const future = new Date(Date.UTC(number("year"), number("month") - 1, number("day") + 20, 7, Math.floor(Math.random() * 60)));
  const local = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).format(future).replace(" ", "T");
  const [date, time] = local.split("T");
  const dayLabel = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Bangkok", weekday: "short", day: "numeric", month: "short",
  }).format(future);
  const topic = `Cancellation E2E ${Date.now()}`;

  await signIn(page, SPECIALIST);
  await expect(page).toHaveURL(/\/schedule$/);
  await page.getByLabel("Date").fill(date);
  await page.getByLabel(/Start time/).fill(time);
  await page.getByLabel("Duration").selectOption("30");
  await page.getByRole("button", { name: "Add time" }).click();
  await expect(page.getByText("Time added.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Log out" }).click();

  await signIn(page, CUSTOMER);
  await expect(page).toHaveURL(/\/slots$/);
  await page.getByRole("button", { name: /Hair transplant consultation.*Somchai/ }).click();
  await page.getByRole("group", { name: "Choose a day" }).getByRole("button", { name: dayLabel, exact: true }).click();
  await page.getByRole("group", { name: "Choose a time" }).getByRole("button", { name: time, exact: true }).click();
  await page.getByLabel("What would you like to discuss?").fill(topic);
  await page.getByRole("button", { name: "Confirm booking" }).click();
  await expect(page).toHaveURL(/\/bookings\/\d+$/);

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Cancel booking" }).click();
  await expect(page.getByTestId("booking-detail")).toContainText("Cancelled");
  await page.reload();
  await expect(page.getByTestId("booking-detail")).toContainText("Cancelled");
  await page.getByRole("link", { name: "Back to my bookings" }).click();
  await expect(page.getByTestId("booking").filter({ hasText: topic })).toContainText("Cancelled");

  await page.getByRole("link", { name: "Book", exact: true }).click();
  await page.getByRole("button", { name: /Hair transplant consultation.*Somchai/ }).click();
  await page.getByRole("group", { name: "Choose a day" }).getByRole("button", { name: dayLabel, exact: true }).click();
  await expect(page.getByRole("group", { name: "Choose a time" }).getByRole("button", { name: time, exact: true })).toBeVisible();
});
