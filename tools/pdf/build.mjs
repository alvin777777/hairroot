// Builds the self-contained Deliverable 1 PDF from the engineering documents.
// Usage: node build.mjs [--final] [--out path]. --final refuses to build while [PENDING] items remain.
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { marked } from "marked";
import { chromium } from "playwright";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../..");
const args = process.argv.slice(2);
const final = args.includes("--final");
const outIndex = args.indexOf("--out");
const out = outIndex >= 0 ? resolve(args[outIndex + 1]) : join(root, "docs/deliverable-1/hairroot-deliverable-1.pdf");
const read = (p) => readFileSync(join(root, p), "utf8");

// Page ranges come from the rendered PDF, so document headings shift down under their Part.
const demote = (md, by = 1) =>
  md.replace(/^(```[\s\S]*?^```)|^(#{1,5}) /gm, (m, code, hashes) => (code ? code : `${"#".repeat(hashes.length + by)} `));

const SPRINT = "docs/sprints/sprint-1";
const PARTS = [
  { id: "A", status: "Documented; reviewed in PRs #12 and #17", title: "Part A: SRS and product scope", points: 10, ids: "FR-01 to FR-18, BR-01 to BR-15, NFR-01 to NFR-12", files: ["docs/srs.md"] },
  { id: "B", status: "Documented; no uncovered requirements", title: "Part B: Feature inventory and traceability", points: 10, ids: "F-01 to F-15, R-01, R-02, C-01, C-02", files: ["docs/features.md", "docs/traceability.md"] },
  { id: "C", status: "Documented", title: "Part C: System-Level SDS", points: 15, ids: "Architecture, data model, role matrix", files: ["docs/system-sds.md"] },
  { id: "D", status: "Documented", title: "Part D: Three-sprint plan", points: 5, ids: "Sprints 1 to 3", files: ["docs/sprints/plan.md"] },
  {
    id: "E",
    status: "Recorded before implementation at commit 141f3a6; revised at 1f408ee (C-01)",
    title: "Part E: Sprint 1 engineering contracts",
    points: 20,
    ids: "F-01 to F-05, AC-01 to AC-27, T-01 to T-32, M-01, M-02",
    files: [
      `${SPRINT}/F-01-F-02-auth-access.md`,
      `${SPRINT}/F-03-slot-creation.md`,
      `${SPRINT}/F-04-booking.md`,
      `${SPRINT}/F-05-booking-views.md`,
      `${SPRINT}/sts.md`,
      `${SPRINT}/definition-of-done.md`,
    ],
  },
  { id: "F", status: "All automated and manual checks passed at d1e8d81 (tag v0.1.0-sprint1)", title: "Part F: Working Sprint 1 and verification", points: 20, ids: "Demonstrations, test results, Issues #4, #5, PRs #15, #16", files: ["docs/deliverable-1/part-f.md"] },
];

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const renderer = new marked.Renderer();
const baseCode = renderer.code.bind(renderer);
renderer.code = (code, lang, escaped) =>
  lang === "mermaid" ? `<pre class="mermaid">${esc(code)}</pre>` : baseCode(code, lang, escaped);
marked.use({ renderer });

function headings(md) {
  const noCode = md.replace(/^```[\s\S]*?^```/gm, "");
  return [...noCode.matchAll(/^## (.+)$/gm)].map((m) => m[1].trim());
}

function bodyHtml() {
  return PARTS.map((part) => {
    const md = part.files.map((f) => (f.endsWith("part-f.md") ? read(f) : demote(read(f)))).join("\n\n");
    part.sections = headings(md);
    return `<section class="part"><h1>${esc(part.title)}</h1>\n${marked.parse(md)}</section>`;
  }).join("\n");
}

const front = marked.parse(read("docs/deliverable-1/front-matter.md"));
const body = bodyHtml();
const CSS = `
  @page { size: A4; margin: 18mm 16mm 18mm 16mm; }
  body { font-family: "Helvetica Neue", Arial, Thonburi, sans-serif; font-size: 10.5pt; line-height: 1.42; color: #1a1a1a; }
  h1 { font-size: 18pt; color: #9a3412; border-bottom: 2px solid #9a3412; padding-bottom: 4px; margin: 0 0 12px; }
  .part { break-before: page; }
  h2 { font-size: 13.5pt; margin: 18px 0 6px; break-after: avoid; color: #7c2d12; }
  h3 { font-size: 11.5pt; margin: 14px 0 4px; break-after: avoid; }
  h4 { font-size: 10.5pt; margin: 10px 0 4px; break-after: avoid; }
  table { border-collapse: collapse; width: 100%; margin: 8px 0 12px; font-size: 9pt; }
  th { background: #fbe4d5; text-align: left; }
  th, td { border: 1px solid #c9a891; padding: 3px 5px; vertical-align: top; overflow-wrap: break-word; }
  th:empty { display: none; }
  tr { break-inside: avoid; }
  code { font-family: Menlo, monospace; font-size: 8.5pt; background: #f4f1ee; padding: 0 2px; overflow-wrap: anywhere; }
  pre { background: #f4f1ee; padding: 8px; font-size: 8pt; white-space: pre-wrap; overflow-wrap: anywhere; }
  pre code { background: none; padding: 0; }
  pre.mermaid { background: none; text-align: center; break-inside: avoid; }
  img { max-width: 62%; max-height: 92mm; border: 1px solid #bbb; display: block; margin: 8px 0 3px; break-inside: avoid; }
  p:has(> img) { break-after: avoid; margin-bottom: 2px; }
  .pending { background: #fde047; font-weight: 600; }
`;

function html(contents) {
  const marked_up = (front + contents + body).replace(/\[PENDING[^\]]*\]/g, (m) => `<span class="pending">${esc(m)}</span>`);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><base href="file://${root}/docs/deliverable-1/"><style>${CSS}</style></head><body>${marked_up}</body></html>`;
}

function contentsHtml(pages) {
  const nav = PARTS.map((p) => `<tr><td>${esc(p.title)}</td><td>${p.points}</td><td>${pages[p.title] ?? "?"}</td><td>${esc(p.ids)}</td><td>${esc(p.status)}</td></tr>`).join("");
  const rows = PARTS.map((p) => {
    const sub = p.sections.map((s) => `<tr><td style="padding-left:16px">${esc(s)}</td><td>${pages[`${p.id}:${s}`] ?? "?"}</td></tr>`).join("");
    return `<tr><td><strong>${esc(p.title)}</strong></td><td>${String(pages[p.title] ?? "?").split("–")[0]}</td></tr>${sub}`;
  }).join("");
  return `<h2>Navigation table</h2><table><tr><th>Part</th><th>Points</th><th>Pages</th><th>Relevant IDs</th><th>Verification status</th></tr>${nav}</table>
  <section class="part"><h1>Contents</h1><table><tr><th>Section</th><th>Page</th></tr>${rows}</table></section>`;
}

function findExecutable() {
  const base = join(homedir(), "Library/Caches/ms-playwright");
  if (!existsSync(base)) return undefined;
  for (const dir of readdirSync(base).filter((d) => /^chromium-\d+/.test(d)).sort().reverse()) {
    for (const sub of ["chrome-mac-arm64", "chrome-mac"]) {
      for (const app of ["Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing", "Chromium.app/Contents/MacOS/Chromium"]) {
        const p = join(base, dir, sub, app);
        if (existsSync(p)) return p;
      }
    }
  }
  return undefined;
}

const browser = await chromium.launch({ executablePath: findExecutable() });
const tmp = mkdtempSync(join(tmpdir(), "hairroot-pdf-"));
async function render(contents, path) {
  const page = await browser.newPage();
  const file = join(tmp, "doc.html");
  writeFileSync(file, html(contents));
  await page.goto(`file://${file}`, { waitUntil: "load" });
  if (await page.$("pre.mermaid")) {
    await page.addScriptTag({ path: join(here, "node_modules/mermaid/dist/mermaid.min.js") });
    await page.evaluate(async () => {
      window.mermaid.initialize({ startOnLoad: false, theme: "neutral" });
      await window.mermaid.run();
    });
  }
  const broken = await page.$$eval("img", (imgs) => imgs.filter((i) => !i.naturalWidth).map((i) => i.getAttribute("src")));
  if (broken.length) console.warn("Missing images:", broken.join(", "));
  await page.pdf({
    path,
    format: "A4",
    printBackground: true,
    preferCSSPageSize: true,
    displayHeaderFooter: true,
    headerTemplate: "<span></span>",
    footerTemplate: `<div style="font-size:8px;width:100%;text-align:center;color:#555">HairRoot, CPE 334 Deliverable 1 · Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>`,
  });
  await page.close();
  return broken;
}

function pageTexts(path) {
  return execFileSync("pdftotext", ["-layout", path, "-"], { encoding: "utf8", maxBuffer: 1 << 28 }).split("\f").slice(0, -1);
}

function locate(path) {
  const texts = pageTexts(path);
  const lines = texts.map((t) => t.split("\n").map((l) => l.trim()));
  const find = (heading, from) => {
    for (let i = from; i < lines.length; i++) if (lines[i].includes(heading)) return i;
    return -1;
  };
  const pages = {};
  let cursor = 0;
  const starts = [];
  for (const part of PARTS) {
    const at = find(part.title, cursor);
    starts.push(at);
    cursor = Math.max(at, 0);
    for (const s of part.sections) {
      const sp = find(s, cursor);
      if (sp >= 0) {
        pages[`${part.id}:${s}`] = sp + 1;
        cursor = sp;
      }
    }
  }
  PARTS.forEach((part, i) => {
    const first = starts[i] + 1;
    const last = i + 1 < PARTS.length ? starts[i + 1] : texts.length;
    pages[part.title] = first === last ? `${first}` : `${first}–${last}`;
  });
  return { pages, total: texts.length };
}

const statuses = PARTS.map((p) => p.status).join(" ");
const pendings = (front + body + statuses).match(/\[PENDING[^\]]*\]/g) ?? [];
if (final && pendings.length) {
  console.error(`Refusing to build the final PDF. ${pendings.length} items are pending:`);
  pendings.forEach((p) => console.error("  " + p));
  await browser.close();
  process.exit(1);
}

const scratch = join(tmp, "pass.pdf");
await render(contentsHtml({}), scratch);
const { pages } = locate(scratch);
await render(contentsHtml(pages), scratch);
const second = locate(scratch);
const broken = await render(contentsHtml(second.pages), out);
await browser.close();
rmSync(tmp, { recursive: true, force: true });
console.log(`Wrote ${out}: ${second.total} pages, ${pendings.length} pending, ${broken.length} missing images`);
PARTS.forEach((p) => console.log(`  ${p.title}: pages ${second.pages[p.title]}`));
