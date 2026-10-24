#!/usr/bin/env node
/**
 * FETCH THE DEPLOYED SITE, TO MEASURE THE DEPLOYED BYTES.
 *
 * The gate can measure a running site (--base), but it does so through a
 * proxy that re-fetches every asset from the origin, one round trip at a
 * time. On a real host that chain is slow: the document arrives, then the
 * stylesheet, then the script — and the instrument's settle window closes
 * before the application has painted. The measurement then records the page
 * BEFORE the app is on it, which is a true statement about a blank frame and
 * a false statement about the layout.
 *
 * So the deployed bytes are fetched once, here, into a directory that is
 * served locally: the same HTML, the same CSS, the same JavaScript, at the
 * same paths. The gate then measures exactly what the deployment serves,
 * with none of the proxy's latency in the way. The files are the ones the
 * public URL answered with — this is a mirror, not a build.
 *
 * Usage: node scripts/spatial/fetch-deployed.mjs <base-url> [out-dir]
 */
import { createHash } from "node:crypto";
import { mkdirSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..");
const BASE = (process.argv[2] || "https://each.nonarkara.org").replace(/\/+$/, "");
const OUT = path.resolve(process.argv[3] || path.join(ROOT, ".spatial-deployed"));

const seen = new Set();
const queue = ["/"];
const written = [];

function localPaths(text) {
  const out = new Set();
  for (const m of text.matchAll(/(?:src|href)\s*=\s*["']([^"']+)["']/gi)) {
    const v = m[1];
    if (!v.startsWith("/") || v.startsWith("//")) continue;
    if (v.startsWith("/api")) continue;
    out.add(v.split("#")[0].split("?")[0]);
  }
  // Chunks the entry script imports, statically or not.
  for (const m of text.matchAll(/["'](\/assets\/[^"']+?\.js)["']/g)) out.add(m[1]);
  for (const m of text.matchAll(/["'](\.\/[^"']+?\.js)["']/g)) out.add("/assets/" + m[1].replace(/^\.\//, ""));
  // The stylesheet's own assets: fonts, images, anything url() points at.
  // A mirror without the fonts is a mirror of a DIFFERENT page — the text
  // falls back and the line lengths change.
  for (const m of text.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi)) {
    const v = m[1];
    if (v.startsWith("data:")) continue;
    if (v.startsWith("/")) out.add(v.split("?")[0]);
    else if (v.startsWith("./")) out.add("/assets/" + v.slice(2).split("?")[0]);
    else if (!v.startsWith("#") && !v.startsWith("data:")) out.add("/assets/" + v.split("?")[0]);
  }
  return [...out];
}

while (queue.length) {
  const route = queue.shift();
  if (seen.has(route)) continue;
  seen.add(route);
  let res, body;
  try {
    res = await fetch(BASE + route, { headers: { "user-agent": "spatial-law-mirror" } });
    body = Buffer.from(await res.arrayBuffer());
  } catch (e) {
    console.error(`  ✗ ${route} — ${e.message}`);
    continue;
  }
  if (!res.ok) {
    console.error(`  ✗ ${route} — ${res.status}`);
    continue;
  }
  const file = route === "/" ? path.join(OUT, "index.html") : path.join(OUT, route.replace(/^\//, ""));
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, body);
  written.push({ route, bytes: body.length, sha: createHash("sha256").update(body).digest("hex").slice(0, 12) });
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("html") || ct.includes("javascript") || ct.includes("json")) {
    for (const p of localPaths(body.toString("utf8"))) if (!seen.has(p)) queue.push(p);
  }
}

console.log(`  · deployed mirror: ${path.relative(ROOT, OUT)} — ${written.length} file(s) fetched from ${BASE}`);
for (const w of written.slice(0, 12)) console.log(`    ${w.route} — ${w.bytes} B — ${w.sha}`);

// The point of a mirror is that it is the deployment, not a rebuild of it.
const local = path.join(ROOT, "dist", "index.html");
if (existsSync(local)) {
  const a = createHash("sha256").update(readFileSync(local)).digest("hex");
  const b = createHash("sha256").update(readFileSync(path.join(OUT, "index.html"))).digest("hex");
  console.log(
    a === b
      ? "  · the deployed index.html is byte-identical to the built one"
      : "  · the deployed index.html DIFFERS from the built one — measure the mirror, not dist",
  );
}
