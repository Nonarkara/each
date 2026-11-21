#!/usr/bin/env node
/**
 * THE EVIDENCE.
 *
 * The MSH law does not accept a green gate as proof of a clean pass. It asks
 * for the real surface, captured, at three widths: a phone fold (390), a
 * laptop window (1024), and a desktop (1440). The 1024 height is recorded by
 * the instrument; here it only needs to be tall enough to show a laptop.
 *
 * The capture runs against the DEPLOYED site by default, so the evidence is
 * of the bytes the reader gets — not of a local build that merely resembles
 * them. Pass a different base to capture something else.
 *
 * Usage:
 *   node scripts/spatial/evidence.mjs [base-url] [out-dir]
 */
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..");

const BASE = (process.argv[2] || "https://each.nonarkara.org").replace(/\/$/, "");
const OUT = path.resolve(ROOT, process.argv[3] || "docs/images/msh-2026-10-29-live");

/** The three widths the law names. */
const SIZES = [
  { w: 390, h: 844 },
  { w: 1024, h: 1000 },
  { w: 1440, h: 900 },
];

/** Every surface a reader lands on. */
const SURFACES = [
  { name: "signin", route: "" },
  { name: "erp", route: "?demo=1&module=erp" },
  { name: "act", route: "?demo=1&module=act" },
  { name: "crm", route: "?demo=1&module=crm" },
  { name: "hr", route: "?demo=1&module=hr" },
  { name: "design", route: "?demo=1&module=design" },
  { name: "dossier", route: "?demo=1&module=dossier" },
  { name: "security", route: "?demo=1&module=security" },
  { name: "intake", route: "?demo=1&module=intake" },
  { name: "mirrors", route: "?demo=1&module=mirrors" },
];

function playwright() {
  // playwright-core is not a dependency of the app. It is found wherever the
  // machine happens to keep it, so the capture does not add a dependency to
  // the product just to prove the product.
  const require = createRequire(import.meta.url);
  const candidates = [
    "playwright-core",
    "/Users/nonarkara/.npm/_npx/dea9475797100b20/node_modules/playwright-core",
  ];
  for (const c of candidates) {
    try {
      return require(c);
    } catch {
      /* try the next one */
    }
  }
  throw new Error(
    "playwright-core not found. Install it (npm i -D playwright-core) or point at an existing copy.",
  );
}

const { chromium } = playwright();
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
let n = 0;
for (const s of SURFACES) {
  for (const { w, h } of SIZES) {
    const ctx = await browser.newContext({
      viewport: { width: w, height: h },
      deviceScaleFactor: 1,
    });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/${s.route}`, { waitUntil: "load" });
    // The paint has to have happened before the shutter opens, or the
    // evidence shows a page that has not finished being a page.
    await page.waitForTimeout(700);
    n += 1;
    const file = path.join(OUT, `${String(n).padStart(2, "0")}-${s.name}-${w}.png`);
    await page.screenshot({ path: file, fullPage: true });
    await ctx.close();
    console.log(`  · ${path.relative(ROOT, file)}`);
  }
}
await browser.close();
console.log(`\n${n} frames of the live site in ${path.relative(ROOT, OUT)}`);
