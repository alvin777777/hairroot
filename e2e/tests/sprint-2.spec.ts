import { expect, test, type Page } from "@playwright/test";

const PASSWORD = "Password123!";
const CUSTOMER = "customer.anan@hairroot.test";
const SPECIALIST = "specialist.somchai@hairroot.test";

async function signIn(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
}

test("T-37 public Home routes anonymous, customer, and specialist users appropriately (AC-28, AC-34)", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "See the clinic’s week take shape." })).toBeVisible();
  await page.getByRole("link", { name: "Sign in" }).first().click();
  await expect(page).toHaveURL(/\/login$/);

  await signIn(page, CUSTOMER);
  await expect(page).toHaveURL(/\/slots$/);
  await page.getByRole("link", { name: "HairRoot" }).click();
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("link", { name: "Open dashboard" })).toBeVisible();
  await page.getByRole("link", { name: "Open dashboard" }).click();
  await expect(page).toHaveURL(/\/slots$/);

  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await signIn(page, SPECIALIST);
  await expect(page).toHaveURL(/\/schedule$/);
  await page.getByRole("link", { name: "HairRoot" }).click();
  await expect(page).toHaveURL("/");
  await page.getByRole("link", { name: "Open dashboard" }).click();
  await expect(page).toHaveURL(/\/schedule$/);
});

test("T-38 public Home has no horizontal overflow at 375 px (AC-34)", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "See the clinic’s week take shape." })).toBeVisible();

  const widths = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  expect(widths.document).toBeLessThanOrEqual(widths.viewport);
  expect(widths.body).toBeLessThanOrEqual(widths.viewport);
});
