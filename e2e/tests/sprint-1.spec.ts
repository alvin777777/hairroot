import { expect, test, type Page } from "@playwright/test";

const PASSWORD = "Password123!";
const SPECIALIST = "specialist.somchai@hairroot.test";
const CUSTOMER = "customer.anan@hairroot.test";
const OTHER_CUSTOMER = "customer.mali@hairroot.test";

async function signIn(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
}

async function createFutureSlot(page: Page, daysAhead: number, hourOffset: number) {
  await signIn(page, SPECIALIST);
  await expect(page).toHaveURL(/\/schedule$/);

  let startAt = "";
  for (let attempt = 0; attempt < 30; attempt += 1) {
    startAt = futureBangkokDateTime(daysAhead + attempt, hourOffset);
    const start = new Date(`${startAt}:00+07:00`);
    const endAt = formatBangkokDateTime(new Date(start.getTime() + 30 * 60_000));

    await page.locator("#startAt").fill(startAt);
    await page.locator("#endAt").fill(endAt);
    await page.getByRole("button", { name: "Add slot" }).click();
    const success = page.getByText("Slot created.", { exact: true });
    const overlap = page.getByRole("alert").filter({ hasText: "overlaps another slot" });
    await expect(success.or(overlap)).toBeVisible();
    if (await success.isVisible().catch(() => false)) break;
    if (attempt === 29) {
      throw new Error(`Could not create E2E slot at ${startAt}.`);
    }
  }

  await expect(page.getByTestId("schedule-slot").filter({ hasText: startAt.slice(-5) })).toBeVisible();
  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/login$/);

  return startAt;
}

function futureBangkokDateTime(daysAhead: number, hourOffset: number) {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);
  const minute = Math.floor(Math.random() * 60);
  const hour = 13 + hourOffset;
  const date = new Date(Date.UTC(year, month - 1, day + daysAhead, hour - 7, minute));
  return formatBangkokDateTime(date);
}

function formatBangkokDateTime(date: Date) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date).replace(" ", "T");
}

test("T-30 logs in, logs out, and redirects a protected route to login", async ({ page }) => {
  await page.goto("/schedule");
  await expect(page).toHaveURL(/\/login$/);

  await signIn(page, SPECIALIST);
  await expect(page).toHaveURL(/\/schedule$/);
  await expect(page.getByText("Dr. Somchai Prasert")).toBeVisible();

  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/schedule");
  await expect(page).toHaveURL(/\/login$/);
});

test("T-31 specialist creates a slot, customer books and reopens it, specialist sees the booking", async ({ page }) => {
  const startAt = await createFutureSlot(page, 9, 0);
  const topic = `E2E consultation ${Date.now()}`;

  await signIn(page, CUSTOMER);
  await expect(page).toHaveURL(/\/slots$/);
  const slot = page.getByTestId("slot").filter({ hasText: startAt.slice(-5) });
  await expect(slot).toBeVisible();
  await slot.getByRole("button", { name: "Book" }).click();
  await page.getByLabel("What would you like to discuss?").fill(topic);
  await page.getByRole("button", { name: "Confirm booking" }).click();
  await expect(page).toHaveURL(/\/bookings\/\d+$/);
  await expect(page.getByTestId("booking-detail")).toContainText(topic);

  await page.getByRole("link", { name: "My bookings", exact: true }).click();
  const booking = page.getByTestId("booking").filter({ hasText: topic });
  await expect(booking).toBeVisible();
  await booking.click();
  await expect(page.getByTestId("booking-detail")).toContainText(topic);

  await page.getByRole("button", { name: "Log out" }).click();
  await signIn(page, SPECIALIST);
  await expect(page.getByTestId("schedule-slot").filter({ hasText: topic })).toContainText("Anan Suksan");
});

test("T-32 shows a conflict and refreshes the list when another customer books first", async ({ page, browser }) => {
  const startAt = await createFutureSlot(page, 39, 1);
  const topic = `E2E race ${Date.now()}`;

  await signIn(page, CUSTOMER);
  const staleSlot = page.getByTestId("slot").filter({ hasText: startAt.slice(-5) });
  await expect(staleSlot).toBeVisible();
  await staleSlot.getByRole("button", { name: "Book" }).click();
  await page.getByLabel("What would you like to discuss?").fill(topic);

  const otherContext = await browser.newContext({ timezoneId: "Asia/Bangkok" });
  try {
    const otherPage = await otherContext.newPage();
    await signIn(otherPage, OTHER_CUSTOMER);
    const sameSlot = otherPage.getByTestId("slot").filter({ hasText: startAt.slice(-5) });
    await expect(sameSlot).toBeVisible();
    await sameSlot.getByRole("button", { name: "Book" }).click();
    await otherPage.getByLabel("What would you like to discuss?").fill(`${topic} other`);
    await otherPage.getByRole("button", { name: "Confirm booking" }).click();
    await expect(otherPage).toHaveURL(/\/bookings\/\d+$/);

    await page.getByRole("button", { name: "Confirm booking" }).click();
    await expect(page.getByRole("alert")).toContainText("Another customer has just taken this time");
    await expect(page.getByTestId("slot").filter({ hasText: startAt.slice(-5) })).toHaveCount(0);
  } finally {
    await otherContext.close();
  }
});
