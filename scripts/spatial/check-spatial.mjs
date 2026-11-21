#!/usr/bin/env node
/**
 * THE SPATIAL GATE, RUN SO THAT IT MEASURES PAGES.
 *
 * The instrument is the law's own and is not edited: it measures, it
 * compares, it decides. What this wrapper adds is the one thing the
 * instrument cannot do for itself — it cannot tell a page that was EMPTY
 * from a page that was FINISHED.
 *
 * A single-page app paints after the document says "interactive". The
 * instrument reads the page when the DOM has been still for a beat, and a
 * page that has not painted yet looks exactly like a page that has: still,
 * quiet, and empty. The receipt then records zero chrome, and the next
 * day's check compares a rendered page against that zero and calls the
 * difference a defect — which is how this project ended up with a receipt
 * and a check that disagreed on six of two hundred and ten measurements,
 * half of them reading 111px in one run and 0px in the next.
 *
 * So every sweep is checked for void measurements (a page measured before
 * it rendered), and a sweep that contains one is not a verdict: it is run
 * again. The instrument's own verdict stands on the sweep that measured
 * every page as a page.
 *
 * The instrument is byte-identical to the law's; this is a project script
 * and it says which bytes it ran.
 *
 *   node scripts/spatial/check-spatial.mjs [--update] [--dir <site>] [--base <url>]
 *                                       [--baseline <file>] [--routes <r>] [--widths <w>]
 *                                       [--sweeps <n>] [--report]
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { voidsOf } from "./void.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..");
const INSTRUMENT = path.join(HERE, "spatial-check.mjs");

const argv = process.argv.slice(2);
function arg(name, fallback) {
  const i = argv.indexOf("--" + name);
  if (i === -1) return fallback;
  const v = argv[i + 1];
  return v && !v.startsWith("--") ? v : true;
}

const UPDATE = argv.includes("--update");
const REPORT = argv.includes("--report");
const BASE = arg("base", null);
const DIR = arg("dir", BASE ? null : ".spatial-site");
const BASELINE = arg("baseline", path.join("design", "spatial-baseline.json"));
const ROUTES = arg("routes", null);
const WIDTHS = arg("widths", null);
const MAX_SWEEPS = Math.max(1, Number(arg("sweeps", 3)) || 3);

if (!existsSync(INSTRUMENT)) {
  console.error(`\nFAIL — the instrument is missing at ${path.relative(ROOT, INSTRUMENT)}.\n`);
  process.exit(1);
}

const digest = createHash("sha256").update(readFileSync(INSTRUMENT)).digest("hex");

const pass = [];
if (DIR) pass.push("--dir", String(DIR));
if (BASE) pass.push("--base", String(BASE));
pass.push("--baseline", String(BASELINE));
if (ROUTES) pass.push("--routes", String(ROUTES));
if (WIDTHS) pass.push("--widths", String(WIDTHS));
if (REPORT) pass.push("--report");
if (UPDATE) pass.push("--update");

const jsonPath = path.join(tmpdir(), `each-spatial-${process.pid}-${Date.now()}.json`);

console.log(`\nSPATIAL GATE — the instrument is ${digest.slice(0, 16)}… (${path.relative(ROOT, INSTRUMENT)})`);
console.log(
  UPDATE
    ? "  · issuing a receipt: every page is measured, and the receipt is written only from rendered pages."
    : "  · checking the receipt: every page is measured, and no measurement of an unrendered page is accepted.",
);

let lastCode = 1;
for (let attempt = 1; attempt <= MAX_SWEEPS; attempt++) {
  const res = spawnSync(process.execPath, [INSTRUMENT, ...pass, "--json", jsonPath], {
    cwd: ROOT,
    stdio: "inherit",
  });
  lastCode = res.status === null ? 1 : res.status;

  let measurements = [];
  try {
    if (existsSync(jsonPath)) {
      const parsed = JSON.parse(readFileSync(jsonPath, "utf8"));
      measurements = parsed.measurements || [];
    }
  } catch {
    measurements = [];
  }

  const voids = voidsOf(measurements);
  if (!voids.length) {
    try { rmSync(jsonPath, { force: true }); } catch { /* nothing to clean */ }
    if (attempt > 1) {
      console.log(`\n  · sweep ${attempt} measured every page as a rendered page — the instrument's verdict stands.`);
    }
    process.exit(lastCode);
  }

  console.error(
    `\n  · sweep ${attempt}/${MAX_SWEEPS}: ${voids.length} page(s) were measured BEFORE they rendered — ` +
      `that is not a measurement of the product, so this sweep is not a verdict.`,
  );
  for (const v of voids.slice(0, 12)) {
    console.error(`      · ${v.route} @${v.w}px — ${v.chars} characters on the page`);
  }
  if (voids.length > 12) console.error(`      · ... and ${voids.length - 12} more`);

  if (attempt === MAX_SWEEPS) {
    console.error(
      `\nFAIL — ${MAX_SWEEPS} sweeps, and the pages still did not render in time.\n` +
        `  A page that cannot be measured as a page cannot be certified. The\n` +
        `  application is painting later than the gate reads, and that is a fact\n` +
        `  about the product, not about the instrument.\n`,
    );
    process.exit(1);
  }
}

process.exit(lastCode);
