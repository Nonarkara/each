#!/usr/bin/env node
/**
 * THE FALSIFIER FOR THE CLIP GATE.
 *
 * A gate that has never failed proves nothing. This one is easy to get wrong
 * in a way nobody would notice: if it simply passed everything, the suite
 * would be green while a phone showed a word cut in half.
 *
 * So here are two sites that DO break: a copy of the build with a control
 * whose label cannot fit its own box, and a copy with a table wider than the
 * screen. Both must be refused — and a real page must still be certified.
 */
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..");
const SITE = path.join(ROOT, ".spatial-site");
const BROKEN = path.join(ROOT, ".spatial-clip");

if (!existsSync(path.join(SITE, "index.html"))) {
  console.error("\nFAIL — there is no prepared site at .spatial-site. Run `npm run check:spatial` first.\n");
  process.exit(1);
}

/* A copy of the site with two defects planted in it. */
rmSync(BROKEN, { recursive: true, force: true });
mkdirSync(BROKEN, { recursive: true });
cpSync(SITE, BROKEN, { recursive: true });
const htmlPath = path.join(BROKEN, "index.html");
const html = readFileSync(htmlPath, "utf8");
writeFileSync(
  htmlPath,
  html.replace(
    "</body>",
    `<div style="width:120px;overflow:hidden;white-space:nowrap"><button type="button" style="width:40px;padding:0 8px;border:1px solid #ccc;background:#fff">A label far too long for its own button</button></div>
</body>`,
  ),
);

function run(args) {
  return spawnSync(process.execPath, [path.join(HERE, "clip.mjs"), ...args], {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
}

const failures = [];
console.log("\nCLIP FALSIFIER — a page that cuts its own content must not be certified.\n");

const brokenRun = run(["--dir", ".spatial-clip", "--widths", "1440", "--routes", "/"]);
const brokenOut = `${brokenRun.stdout || ""}${brokenRun.stderr || ""}`;
if (brokenRun.status === 0) {
  failures.push("the clip gate certified a page whose control cannot fit its own label");
}
if (!/does not fit/.test(brokenOut)) {
  failures.push("the clip gate did not say what does not fit");
}
console.log(
  `  · the broken page → exit ${brokenRun.status}` +
    (/does not fit/.test(brokenOut) ? "  · refused, with the right reason" : "  · NOT REFUSED AS EXPECTED"),
);

const cleanRun = run(["--dir", ".spatial-site", "--widths", "390,1440", "--routes", "/"]);
const cleanOut = `${cleanRun.stdout || ""}${cleanRun.stderr || ""}`;
if (cleanRun.status !== 0) {
  failures.push(`the clip gate refused a real page (exit ${cleanRun.status}) — it is measuring something it should not`);
}
console.log(
  `  · a real page → exit ${cleanRun.status}` + (cleanRun.status === 0 ? "  · certified" : "  · REFUSED A REAL PAGE"),
);

rmSync(BROKEN, { recursive: true, force: true });

if (failures.length) {
  console.error(`\nFAIL — the clip gate does not hold:\n`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  console.error("");
  process.exit(1);
}
console.log("\nPASS — the clip gate refuses a page that cuts its content and certifies one that does not.\n");
