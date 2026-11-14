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

// The guided UI shows times as HH:MM within a chosen day, so slots are matched by day and time.
async function createFutureSlot(page: Page, daysAhead: number, hourOffset: number) {
  await signIn(page, SPECIALIST);
  await expect(page).toHaveURL(/\/schedule$/);

  let startAt = "";
  for (let attempt = 0; attempt < 30; attempt += 1) {
    startAt = futureBangkokDateTime(daysAhead + attempt, hourOffset);
    const [date, time] = startAt.split("T");

    await page.getByLabel("Date").fill(date);
    await page.getByLabel(/Start time/).fill(time);
    await page.getByLabel("Duration").selectOption("30");
    await page.getByRole("button", { name: "Add time" }).click();
    const success = page.getByText("Time added.", { exact: true });
    const overlap = page.getByRole("alert").filter({ hasText: "overlaps another slot" });
    await expect(success.or(overlap)).toBeVisible();
    if (await success.isVisible().catch(() => false)) break;
    if (attempt === 29) {
      throw new Error(`Could not create E2E slot at ${startAt}.`);
    }
  }

  const day = page.locator("section").filter({ has: page.getByRole("heading", { name: dayLabel(startAt), exact: true }) });
  await expect(day.getByTestId("schedule-slot").filter({ hasText: `${startAt.slice(-5)} to` })).toBeVisible();
  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/login$/);

  return startAt;
}

function dayLabel(startAt: string) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Bangkok", weekday: "short", day: "numeric", month: "short" })
    .format(new Date(`${startAt}:00+07:00`));
}

// Walks the guided flow up to the confirmation step for the specialist's consultation service.
async function chooseSlot(page: Page, startAt: string, topic: string) {
  await expect(page).toHaveURL(/\/slots$/);
  await page.getByRole("button", { name: /Hair transplant consultation.*Somchai/ }).click();
  await page.getByRole("group", { name: "Choose a day" }).getByRole("button", { name: dayLabel(startAt), exact: true }).click();
  await page.getByRole("group", { name: "Choose a time" }).getByRole("button", { name: startAt.slice(-5), exact: true }).click();
  await page.getByLabel("What would you like to discuss?").fill(topic);
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
  await chooseSlot(page, startAt, topic);
  await page.getByRole("button", { name: "Confirm booking" }).click();
  await expect(page).toHaveURL(/\/bookings\/\d+$/);
  await expect(page.getByTestId("booking-detail")).toContainText(topic);
  await expect(page.getByText("Your booking is confirmed.")).toBeVisible();

  await page.getByRole("link", { name: "My bookings", exact: true }).click();
  const booking = page.getByTestId("booking").filter({ hasText: topic });
  await expect(booking).toBeVisible();
  await booking.click();
  await expect(page.getByTestId("booking-detail")).toContainText(topic);

  await page.getByRole("button", { name: "Log out" }).click();
  await signIn(page, SPECIALIST);
  await expect(page.getByTestId("schedule-slot").filter({ hasText: topic })).toContainText("Anan Suksan");
});

test("T-32 shows a conflict and refreshes the times when another customer books first", async ({ page, browser }) => {
  const startAt = await createFutureSlot(page, 39, 1);
  const topic = `E2E race ${Date.now()}`;

  await signIn(page, CUSTOMER);
  await chooseSlot(page, startAt, topic);

  const otherContext = await browser.newContext({ timezoneId: "Asia/Bangkok" });
  try {
    const otherPage = await otherContext.newPage();
    await signIn(otherPage, OTHER_CUSTOMER);
    await chooseSlot(otherPage, startAt, `${topic} other`);
    await otherPage.getByRole("button", { name: "Confirm booking" }).click();
    await expect(otherPage).toHaveURL(/\/bookings\/\d+$/);

    await page.getByRole("button", { name: "Confirm booking" }).click();
    await expect(page.getByRole("alert")).toContainText("Another customer has just taken this time");
    // The refreshed flow no longer offers the taken time on that day.
    const takenDay = page.getByRole("group", { name: "Choose a day" }).getByRole("button", { name: dayLabel(startAt), exact: true });
    if (await takenDay.count()) {
      await takenDay.click();
      await expect(page.getByRole("group", { name: "Choose a time" }).getByRole("button", { name: startAt.slice(-5), exact: true })).toHaveCount(0);
    }
  } finally {
    await otherContext.close();
  }
});
