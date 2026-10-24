#!/usr/bin/env node
/**
 * VERIFY THE INSTRUMENT IS STILL THE INSTRUMENT.
 *
 * The MSH law requires the gate and the falsifier to be vendored byte for
 * byte: a gate that an agent has edited is no longer the gate the law names.
 * So the hashes are recorded in MANIFEST.sha256 and checked here. If a file
 * has changed, this fails — and it fails loudly, before anything is measured.
 *
 * Usage: node scripts/spatial/verify-manifest.mjs
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..");
const MANIFEST = path.join(HERE, "MANIFEST.sha256");

const rows = readFileSync(MANIFEST, "utf8")
  .split("\n")
  .map((line) => line.trim())
  .filter(Boolean)
  .map((line) => {
    const [hash, file] = line.split(/\s+/, 2);
    return { hash, file };
  });

if (!rows.length) {
  console.error(`\nFAIL — ${path.relative(ROOT, MANIFEST)} lists nothing to verify.\n`);
  process.exit(1);
}

let bad = 0;
for (const { hash, file } of rows) {
  const full = path.join(ROOT, file);
  let actual = "";
  try {
    actual = createHash("sha256").update(readFileSync(full)).digest("hex");
  } catch {
    console.error(`  ✗ ${file} — missing`);
    bad += 1;
    continue;
  }
  if (actual !== hash) {
    console.error(`  ✗ ${file} — changed`);
    console.error(`      expected ${hash}`);
    console.error(`      actual   ${actual}`);
    bad += 1;
  } else {
    console.log(`  · ${file} — byte-identical`);
  }
}

if (bad) {
  console.error(
    `\nFAIL — ${bad} file(s) are not the instrument the law names.\n` +
      "  The vendored gate and falsifier must stay byte-identical to\n" +
      "  /Users/nonarkara/.minimax/skills/spatial-law/bin. If the law itself\n" +
      "  changed there, copy it over — do not edit it here.\n",
  );
  process.exit(1);
}

console.log(`  · spatial: ${rows.length} files byte-identical to the manifest`);
process.exit(0);
