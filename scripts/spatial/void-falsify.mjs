#!/usr/bin/env node
/**
 * THE FALSIFIER FOR THE VOID CHECK.
 *
 * A gate is worth nothing unless it fails when it should. This one is easy
 * to get wrong in a way nobody would notice: if the wrapper simply passed
 * everything, the suite would be green and the receipt would be a receipt of
 * empty pages.
 *
 * So here is a site that NEVER RENDERS: the same build, with the script that
 * paints it removed. Every page of it is empty — no chrome, no text, no
 * heading — and it is exactly the shape of the flake that broke this gate
 * twice.
 *
 * The wrapper must:
 *   · refuse to certify it,
 *   · say WHY (the pages were measured before they rendered),
 *   · and not claim a pass.
 *
 * A clean site must still pass, or the wrapper is not measuring anything.
 */
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..");
const SITE = path.join(ROOT, ".spatial-site");
const VOID_SITE = path.join(ROOT, ".spatial-void");

if (!existsSync(path.join(SITE, "index.html"))) {
  console.error("\nFAIL — there is no prepared site at .spatial-site. Run `npm run check:spatial` first.\n");
  process.exit(1);
}

/* The site that never paints. */
rmSync(VOID_SITE, { recursive: true, force: true });
mkdirSync(VOID_SITE, { recursive: true });
cpSync(SITE, VOID_SITE, { recursive: true });
const htmlPath = path.join(VOID_SITE, "index.html");
const html = readFileSync(htmlPath, "utf8");
writeFileSync(
  htmlPath,
  html.replace(/<script[^>]*\ssrc="[^"]+"[^>]*><\/script>/gi, "<!-- the script that paints this page has been removed -->"),
);

function run(args) {
  return spawnSync(process.execPath, [path.join(HERE, "check-spatial.mjs"), ...args], {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
}

const failures = [];

console.log("\nVOID FALSIFIER — a site that never renders must not be certified.\n");

/* 1 · the site that never renders must be refused, and for the right reason. */
const voidRun = run(["--dir", ".spatial-void", "--sweeps", "2", "--widths", "390,1440", "--routes", "/"]);
const voidOut = `${voidRun.stdout || ""}${voidRun.stderr || ""}`;
if (voidRun.status === 0) {
  failures.push("the wrapper certified a site whose pages never rendered");
}
if (!/measured BEFORE they rendered/.test(voidOut)) {
  failures.push("the wrapper did not say that the pages were measured before they rendered");
}
if (/PASS/i.test(voidOut) && !/not a measurement of the product/.test(voidOut)) {
  failures.push("the wrapper printed a pass for a site whose pages never rendered");
}
console.log(
  `  · the site that never renders → exit ${voidRun.status}` +
    (/measured BEFORE they rendered/.test(voidOut) ? "  · refused, with the right reason" : "  · NOT REFUSED AS EXPECTED"),
);

/* 2 · a real site must still pass, or the check measures nothing. */
const cleanRun = run(["--dir", ".spatial-site", "--sweeps", "1", "--widths", "390,1440", "--routes", "/"]);
const cleanOut = `${cleanRun.stdout || ""}${cleanRun.stderr || ""}`;
if (cleanRun.status !== 0) {
  failures.push(`the wrapper refused a real page (exit ${cleanRun.status}) — the check is measuring something it should not`);
}
if (/measured BEFORE they rendered/.test(cleanOut)) {
  failures.push("the wrapper called a rendered page void");
}
console.log(
  `  · a real page → exit ${cleanRun.status}` +
    (cleanRun.status === 0 ? "  · certified" : "  · REFUSED A REAL PAGE"),
);

rmSync(VOID_SITE, { recursive: true, force: true });

if (failures.length) {
  console.error(`\nFAIL — the void check does not hold:\n`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  console.error("");
  process.exit(1);
}
console.log("\nPASS — the void check refuses an unrendered page and certifies a rendered one.\n");
