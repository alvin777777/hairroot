// Builds a short lab report PDF from one Markdown file. Images resolve relative to the Markdown file.
// Usage: node build-report.mjs <report.md> <out.pdf> [--final]
// --final refuses to build while any [PENDING ...] marker remains.
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { marked } from "marked";
import { chromium } from "playwright";

const [input, output] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const final = process.argv.includes("--final");
if (!input || !output) {
  console.error("Usage: node build-report.mjs <report.md> <out.pdf> [--final]");
  process.exit(2);
}
const md = readFileSync(resolve(input), "utf8");
const pending = md.match(/\[PENDING[^\]]*\]/g) ?? [];
if (final && pending.length) {
  console.error(`Refusing to build the final PDF. ${pending.length} items are pending:`);
  pending.forEach((p) => console.error("  " + p));
  process.exit(1);
}

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const body = marked.parse(md).replace(/\[PENDING[^\]]*\]/g, (m) => `<span class="pending">${esc(m)}</span>`);
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
const html = join(tmp, "report.html");
writeFileSync(html, `<!doctype html><html><head><meta charset="utf-8"><base href="file://${dirname(resolve(input))}/"><style>${css}</style></head><body>${body}</body></html>`);
const browser = await chromium.launch({ executablePath: findExecutable() });
const page = await browser.newPage();
await page.goto(`file://${html}`, { waitUntil: "load" });
const missing = await page.$$eval("img", (imgs) => imgs.filter((i) => !i.naturalWidth).map((i) => i.getAttribute("src")));
await page.pdf({
  path: resolve(output), format: "A4", printBackground: true, preferCSSPageSize: true, displayHeaderFooter: true,
  headerTemplate: "<span></span>",
  footerTemplate: `<div style="font-size:8px;width:100%;text-align:center;color:#555">Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>`,
});
await browser.close();
rmSync(tmp, { recursive: true, force: true });
console.log(`Wrote ${resolve(output)}: ${pending.length} pending, ${missing.length} missing images${missing.length ? ": " + missing.join(", ") : ""}`);
