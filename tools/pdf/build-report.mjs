// Builds a lab report PDF from one or more Markdown files, joined in order. Images resolve relative to
// the first file. A line "<!-- TOC -->" becomes a contents table of level-2 headings with page numbers.
// Usage: node build-report.mjs <a.md> [<b.md> ...] <out.pdf> [--final]
// --final refuses to build while any [PENDING ...] marker remains.
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { marked } from "marked";
import { chromium } from "playwright";

const files = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const final = process.argv.includes("--final");
const output = files.pop();
const input = files[0];
if (!input || !output) {
  console.error("Usage: node build-report.mjs <a.md> [<b.md> ...] <out.pdf> [--final]");
  process.exit(2);
}
const md = files.map((f) => readFileSync(resolve(f), "utf8")).join("\n\n");
const pending = md.match(/\[PENDING[^\]]*\]/g) ?? [];
if (final && pending.length) {
  console.error(`Refusing to build the final PDF. ${pending.length} items are pending:`);
  pending.forEach((p) => console.error("  " + p));
  process.exit(1);
}

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const headings = [...md.replace(/^```[\s\S]*?^```/gm, "").matchAll(/^## (.+)$/gm)].map((m) => m[1].trim());
const plain = (h) => h.replace(/[`*_]/g, "");
const tocHtml = (pages) =>
  `<table class="toc"><tr><th>Section</th><th>Page</th></tr>${headings
    .map((h) => `<tr><td>${esc(plain(h))}</td><td>${pages[h] ?? "?"}</td></tr>`)
    .join("")}</table>`;
const bodyWith = (pages) =>
  marked
    .parse(md)
    .replace("<!-- TOC -->", tocHtml(pages))
    .replace(/\[PENDING[^\]]*\]/g, (m) => `<span class="pending">${m}</span>`);
const css = `
  @page { size: A4; margin: 16mm 15mm; }
  body { font-family: "Helvetica Neue", Arial, Thonburi, sans-serif; font-size: 10.5pt; line-height: 1.4; color: #1a1a1a; }
  h1 { font-size: 17pt; color: #9a3412; border-bottom: 2px solid #9a3412; padding-bottom: 4px; margin: 0 0 10px; }
  h2 { font-size: 13.5pt; color: #7c2d12; margin: 20px 0 6px; break-after: avoid; border-bottom: 1px solid #e5c8b5; }
  h3 { font-size: 11pt; margin: 12px 0 4px; break-after: avoid; }
  table { border-collapse: collapse; width: 100%; margin: 6px 0 10px; font-size: 9pt; }
  th { background: #fbe4d5; text-align: left; }
  th, td { border: 1px solid #c9a891; padding: 3px 5px; vertical-align: top; overflow-wrap: break-word; }
  th:empty { display: none; }
  tr { break-inside: avoid; }
  a { color: #1d4ed8; overflow-wrap: anywhere; }
  code { font-family: Menlo, monospace; font-size: 8.5pt; background: #f4f1ee; padding: 0 2px; overflow-wrap: anywhere; }
  pre { background: #f4f1ee; padding: 7px; font-size: 7.8pt; white-space: pre-wrap; overflow-wrap: anywhere; }
  pre code { background: none; padding: 0; }
  img { max-width: 100%; border: 1px solid #bbb; display: block; margin: 6px 0 2px; break-inside: avoid; }
  p:has(> img) { break-after: avoid; margin-bottom: 0; }
  em { color: #444; }
  .pending { background: #fde047; font-weight: 600; }
  table.toc td:last-child, table.toc th:last-child { width: 50px; text-align: right; }
  table.toc { break-after: page; }
`;

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

const tmp = mkdtempSync(join(tmpdir(), "report-"));
const browser = await chromium.launch({ executablePath: findExecutable() });
async function render(pages, path) {
  const html = join(tmp, "report.html");
  writeFileSync(html, `<!doctype html><html><head><meta charset="utf-8"><base href="file://${dirname(resolve(input))}/"><style>${css}</style></head><body>${bodyWith(pages)}</body></html>`);
  const page = await browser.newPage();
  await page.goto(`file://${html}`, { waitUntil: "load" });
  const missing = await page.$$eval("img", (imgs) => imgs.filter((i) => !i.naturalWidth).map((i) => i.getAttribute("src")));
  await page.pdf({
    path, format: "A4", printBackground: true, preferCSSPageSize: true, displayHeaderFooter: true,
    headerTemplate: "<span></span>",
    footerTemplate: `<div style="font-size:8px;width:100%;text-align:center;color:#555">Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>`,
  });
  await page.close();
  return missing;
}
// Page numbers come from the rendered PDF: render, find each heading's page, then render again.
function locate(path) {
  const texts = execFileSync("pdftotext", ["-layout", path, "-"], { encoding: "utf8", maxBuffer: 1 << 28 }).split("\f");
  const pages = {};
  // Content starts on the page after the contents table (it ends with a page break), so headings are
  // searched only from there; pdftotext can print a contents row's title on a line of its own.
  const tocPage = texts.findIndex((t) => t.split("\n").some((l) => /^Section\s+Page$/.test(l.trim())));
  let from = tocPage >= 0 ? tocPage + 1 : 0;
  for (const h of headings) {
    const needle = plain(h);
    for (let i = from; i < texts.length; i++) {
      if (texts[i].split("\n").some((l) => l.trim() === needle)) {
        pages[h] = i + 1;
        from = i;
        break;
      }
    }
  }
  return pages;
}
let missing;
if (md.includes("<!-- TOC -->")) {
  const pass = join(tmp, "pass.pdf");
  await render({}, pass);
  let pages = locate(pass);
  await render(pages, pass);
  pages = locate(pass);
  missing = await render(pages, resolve(output));
} else {
  missing = await render({}, resolve(output));
}
await browser.close();
rmSync(tmp, { recursive: true, force: true });
console.log(`Wrote ${resolve(output)}: ${pending.length} pending, ${missing.length} missing images${missing.length ? ": " + missing.join(", ") : ""}`);
