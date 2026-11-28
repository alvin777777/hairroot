// Lab 7 E-B9 post-deployment checks on live HairRoot. Headed browser; the tester types
// every password into the browser window. This script never reads, stores, or logs it.
// Mutations: creates one 30-minute slot on S1's schedule (the 29-minute request is rejected).
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(here, "..", "hairroot", "e2e", "package.json"));
const { chromium } = require("playwright");

const BASE = "https://hairroot-368003298307.asia-southeast1.run.app";
const LEGACY_START = "2026-12-12T12:00:00.000Z"; // 12 Dec 2026 19:00 Bangkok
const out = path.join(here, "lab7-eb9");
mkdirSync(out, { recursive: true });
const log = [];
const record = (id, expected, actual, pass) => {
  const result = pass ? "PASS" : "FAIL";
  log.push({ id, expected, actual, result, at: new Date().toISOString() });
  console.log(`${result.padEnd(5)} ${id}: ${actual}`);
};

const browser = await chromium.launch({ headless: false });
const newCtx = () => browser.newContext({ viewport: { width: 1280, height: 900 }, timezoneId: "Asia/Bangkok" });

async function banner(page, text, colour = "#111") {
  await page.evaluate(([t, c]) => {
    document.getElementById("uat-banner")?.remove();
    const b = document.createElement("div");
    b.id = "uat-banner"; b.textContent = t;
    Object.assign(b.style, { position: "fixed", top: 0, left: 0, right: 0, zIndex: 99999, background: c, color: "#7CFC00",
      font: "12px monospace", padding: "4px 6px", whiteSpace: "pre-wrap" });
    document.body.appendChild(b);
  }, [text, colour]);
}
async function shot(page, id, note = "", fullPage = false) {
  const t = new Date();
  const local = t.toLocaleString("en-GB", { timeZone: "Asia/Bangkok", hour12: false });
  await banner(page, `HairRoot Lab 7 E-B9 ${id} | tester ไอโว | ${local} Bangkok (${t.toISOString()}) | ${page.url()}${note ? "\n" + note : ""}`);
  await page.screenshot({ path: path.join(out, `${id}.png`), fullPage });
  await page.evaluate(() => document.getElementById("uat-banner")?.remove());
}
const api = (page, url, init) => page.evaluate(async ([u, i]) => {
  const r = await fetch(u, { credentials: "same-origin", ...(i ?? {}) });
  let body = null; try { body = await r.json(); } catch {}
  return { status: r.status, body };
}, [url, init ?? null]);
const post = (page, url, data) => api(page, url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });

async function manualLogin(page, email) {
  await page.goto(`${BASE}/login`);
  await page.getByLabel("Email").fill(email);
  await banner(page, `>>> ไอโว: พิมพ์รหัสผ่านของ ${email} ในช่อง Password แล้วกด Sign in <<<`, "#8b0000");
  await page.getByLabel("Password").focus();
  console.log(`WAITING for you to type the password for ${email} in the browser window...`);
  await page.waitForURL((u) => u.pathname !== "/login", { timeout: 900000 });
  await page.waitForLoadState("networkidle");
}

const bkk = (iso) => new Date(iso).toLocaleString("en-GB", { timeZone: "Asia/Bangkok", hour12: false });

try {
  let ctx = await newCtx(); let page = await ctx.newPage();
  // (3) version and readiness
  const version = await (await page.request.get(`${BASE}/api/version`)).json();
  const ready = await (await page.request.get(`${BASE}/api/ready`)).json();
  await page.goto(`${BASE}/login`); await page.waitForLoadState("networkidle");
  await page.getByTestId("app-version").waitFor();
  const footer = (await page.getByTestId("app-version").innerText()).trim();
  await shot(page, "E-B9-01-version-ready", `/api/version -> ${JSON.stringify(version)} | /api/ready -> ${JSON.stringify(ready)} | footer: ${footer}`);
  record("version/ready", "commit b29aef9…, ready + db connected, footer Version b29aef9",
    `${version.commit}; ${JSON.stringify(ready)}; footer "${footer}"`,
    version.commit?.startsWith("b29aef9") && ready.status === "ready" && ready.db === "connected" && footer.includes("b29aef9"));

  // S1
  await manualLogin(page, "specialist.somchai@hairroot.test");
  await page.goto(`${BASE}/schedule`); await page.getByRole("heading", { name: "My schedule" }).waitFor();
  const options = await page.locator("#duration option").allInnerTexts();
  await page.locator("#duration").focus();
  await shot(page, "E-B9-02-duration-options", `Duration options: ${options.join(", ")}`);
  record("duration list", "starts at 30 minutes; no 15", options.join(", "), options[0] === "30 minutes" && !options.some((o) => o.startsWith("15 ")));

  const { body: mine } = await api(page, "/api/schedules/mine");
  const all = [];
  for (const s of mine.schedules) {
    const { body } = await api(page, `/api/schedules/${s.id}/slots`);
    for (const sl of body.slots) all.push({ ...sl, schedule: s });
  }
  const legacy = all.find((s) => new Date(s.startAt).toISOString() === LEGACY_START);
  const legacyMin = legacy ? (new Date(legacy.endAt) - new Date(legacy.startAt)) / 60000 : null;

  // pick a free 30-minute window on the first schedule: 20 Dec 2026 from 10:00 Bangkok, hourly
  const sched = mine.schedules[0];
  const taken = all.filter((s) => s.schedule.id === sched.id);
  let start;
  for (let h = 10; h < 20; h++) {
    const st = new Date(`2026-12-20T${String(h).padStart(2, "0")}:00:00+07:00`);
    const en = new Date(st.getTime() + 30 * 60000);
    if (!taken.some((s) => new Date(s.startAt) < en && new Date(s.endAt) > st)) { start = st; break; }
  }
  const end29 = new Date(start.getTime() + 29 * 60000);
  const r29 = await post(page, `/api/schedules/${sched.id}/slots`, { startAt: start.toISOString(), endAt: end29.toISOString() });
  const msg29 = JSON.stringify(r29.body);
  record("29-minute slot (API)", "400 VALIDATION; 'A slot must last 30 to 120 minutes.'", `${r29.status} ${msg29}`,
    r29.status === 400 && msg29.includes("30 to 120"));
  await banner(page, `POST /api/schedules/${sched.id}/slots ${bkk(start)}–${bkk(end29)} Bangkok (29 min)\n-> ${r29.status} ${msg29}`);
  await page.screenshot({ path: path.join(out, "E-B9-03-29min-rejected.png") });

  // 30-minute slot via the UI
  await page.locator("#schedule").selectOption(String(sched.id));
  const dateStr = start.toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });
  const timeStr = start.toLocaleTimeString("en-GB", { timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit", hour12: false });
  await page.locator("#date").fill(dateStr);
  await page.locator("#time").fill(timeStr);
  await page.locator("#duration").selectOption("30");
  const resP = page.waitForResponse((r) => r.request().method() === "POST" && /\/api\/schedules\/\d+\/slots$/.test(new URL(r.url()).pathname));
  await page.getByRole("button", { name: "Add time" }).click();
  const r30 = await resP;
  const r30body = await r30.json().catch(() => null);
  await page.waitForLoadState("networkidle");
  const newRow = page.getByTestId("schedule-slot").filter({ hasText: `${timeStr} to` });
  await newRow.first().scrollIntoViewIfNeeded().catch(() => {});
  await shot(page, "E-B9-04-30min-accepted", `UI: ${sched.name}, ${dateStr} ${timeStr}, 30 minutes -> ${r30.status()} slot ${r30body?.slot?.id ?? "?"}`);
  record("30-minute slot (UI)", "201; slot listed as Available", `${r30.status()} slot ${r30body?.slot?.id} ${dateStr} ${timeStr}`, r30.status() === 201);

  // legacy 15-minute slot on S1's schedule
  if (legacy) {
    await page.locator("#schedule").selectOption(String(legacy.schedule.id));
    await page.waitForLoadState("networkidle");
    const row = page.getByTestId("schedule-slot").filter({ hasText: "19:00 to 19:15" });
    await row.first().scrollIntoViewIfNeeded().catch(() => {});
    await row.first().evaluate((el) => { el.style.outline = "3px solid red"; }).catch(() => {});
  }
  await shot(page, "E-B9-05-legacy-slot-S1", legacy
    ? `legacy slot ${legacy.id}: ${bkk(legacy.startAt)}–${bkk(legacy.endAt)} (${legacyMin} min), ${legacy.booking ? `Booked by ${legacy.booking.customer.name} (booking ${legacy.booking.id})` : "Available"}`
    : "legacy slot NOT found");
  record("legacy 15-minute slot (S1)", "12 Dec 19:00–19:15 still listed", legacy ? `slot ${legacy.id}, ${legacyMin} min, ${legacy.booking ? `booked by ${legacy.booking.customer.name}, booking ${legacy.booking.id}` : "available"}` : "not found",
    !!legacy && legacyMin === 15);
  await page.getByRole("button", { name: /log out|sign out/i }).click().catch(() => {});
  await ctx.close();

  // Customer who holds the legacy booking (C1 per Lab 6), read-only
  if (legacy?.booking) {
    ctx = await newCtx(); page = await ctx.newPage();
    await manualLogin(page, "customer.anan@hairroot.test");
    const { body } = await api(page, "/api/bookings/mine");
    const b = body?.bookings?.find((x) => x.id === legacy.booking.id);
    await page.goto(`${BASE}/bookings`); await page.waitForLoadState("networkidle");
    await shot(page, "E-B9-06-legacy-booking-C1", b ? `booking ${b.id}: ${JSON.stringify(b).slice(0, 220)}` : `booking ${legacy.booking.id} not in /api/bookings/mine`, true);
    record("legacy booking (C1)", `booking ${legacy.booking.id} still listed`, b ? `found booking ${b.id}` : "not found", !!b);
    await ctx.close();
  }
} catch (e) {
  console.error("STOPPED:", e.message);
  log.push({ error: e.message, at: new Date().toISOString() });
} finally {
  await browser.close();
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  writeFileSync(path.join(out, `results-${stamp}.json`), JSON.stringify({ tester: "ไอโว ปีเตอร์ อัลวิน รันเน่ (passwords typed by the tester; browser steps scripted)", base: BASE, results: log }, null, 2));
  console.log("DONE. Evidence in", out);
}
