// Captures Lab 5 C-04 evidence from the live service with a URL and time banner on each screenshot.
// The demo password is read from HAIRROOT_DEMO_PASSWORD in your own shell and is never printed or saved.
// Usage: HAIRROOT_URL=https://... [HAIRROOT_DEMO_PASSWORD=...] node capture-live.mjs <out-dir>
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

const base = (process.env.HAIRROOT_URL ?? "").replace(/\/$/, "");
const password = process.env.HAIRROOT_DEMO_PASSWORD ?? "";
const out = process.argv[2] ?? ".";
if (!base) throw new Error("Set HAIRROOT_URL");
mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
const newPage = async () => (await browser.newContext({ viewport: { width: 1100, height: 760 }, timezoneId: "Asia/Bangkok" })).newPage();

// The banner records the real address and time; it is added by this script, not by the app.
async function shot(page, name) {
  await page.mouse.move(0, 0);
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    document.getElementById("evidence-banner")?.remove();
    const b = document.createElement("div");
    b.id = "evidence-banner";
    b.textContent = `${location.href}  |  ${new Date().toISOString()}  |  captured by tools/pdf/capture-live.mjs`;
    Object.assign(b.style, { position: "fixed", bottom: "0", left: "0", right: "0", background: "#111", color: "#fff", font: "12px Menlo, monospace", padding: "4px 8px", zIndex: "99999" });
    document.body.appendChild(b);
  });
  await page.screenshot({ path: `${out}/${name}.png` });
  console.log("saved", name);
}
const signIn = async (page, email, pw) => {
  await page.goto(base + "/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(pw);
  await page.getByRole("button", { name: "Sign in" }).click();
};

const anon = await newPage();
await anon.goto(base + "/bookings");
await anon.waitForURL(/\/login$/);
await shot(anon, "c04-1-protected-page-redirects-to-login");
await signIn(anon, "customer.anan@hairroot.test", "Wrong-Pass1");
await anon.getByRole("alert").waitFor();
await shot(anon, "c04-2-wrong-password-rejected");

if (!password) {
  console.log("HAIRROOT_DEMO_PASSWORD not set: skipped the signed-in screenshots.");
} else {
  const c1 = await newPage();
  await signIn(c1, "customer.anan@hairroot.test", password);
  await c1.waitForURL(/\/slots$/);
  await c1.getByRole("button", { name: /Hair transplant consultation.*Somchai/ }).click();
  const days = c1.getByRole("group", { name: "Choose a day" }).getByRole("button");
  await days.nth(Math.min(5, (await days.count()) - 1)).click();
  const times = c1.getByRole("group", { name: "Choose a time" }).getByRole("button");
  await times.last().click();
  await c1.getByLabel(/discuss/).fill("Lab 5 live check");
  await shot(c1, "c04-3-customer-confirm-step");
  await c1.getByRole("button", { name: "Confirm booking" }).click();
  await c1.getByTestId("booking-detail").waitFor();
  await shot(c1, "c04-4-booking-confirmed");
  const bookingUrl = c1.url();
  const c2 = await newPage();
  await signIn(c2, "customer.mali@hairroot.test", password);
  await c2.waitForURL(/\/slots$/);
  await c2.goto(bookingUrl);
  await c2.getByRole("alert").waitFor();
  await shot(c2, "c04-5-other-customers-booking-not-found");
  const s1 = await newPage();
  await signIn(s1, "specialist.somchai@hairroot.test", password);
  await s1.getByText("Times and bookings").waitFor();
  const row = s1.getByTestId("schedule-slot").filter({ hasText: "Lab 5 live check" }).first();
  await row.scrollIntoViewIfNeeded();
  await shot(s1, "c04-6-specialist-sees-booking");
  console.log("Booking created for evidence:", bookingUrl.replace(base, ""));
}
await browser.close();
