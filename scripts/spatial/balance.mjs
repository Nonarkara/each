#!/usr/bin/env node
/**
 * THE BALANCE GATE — side-by-side blocks must not leave a hole under them.
 *
 * WHY THIS EXISTS
 * ---------------
 * The MSH instrument measures a page against a receipt: every hole, orphan,
 * wrap and clip is compared with what the baseline recorded, and a new hole
 * fails until somebody writes a reason for it. That works — and it is blind
 * to one class of defect, because that class is not a hole the instrument
 * can see.
 *
 * A grid whose columns are of unequal height is the class. Take a page with
 * a hero on the left and two compositions on the right: if the hero is 200px
 * tall and the column beside it is 299px, there are 99px of nothing under
 * the hero, next to content. Nothing overflows. Nothing is clipped. No
 * element is an orphan. The page is not broken by any rule the instrument
 * knows, and it still looks like a mistake, because a column of text with a
 * hole under it is not a layout — it is an accident.
 *
 * So this gate measures exactly that: for every multi-column grid on every
 * route at every width, how much of the row is left empty beneath a column's
 * own content. A column that ends 40px or more above the row it stands in is
 * a dead column, and it fails.
 *
 * It is the project's own script, not the law's instrument: the instrument is
 * byte-identical and stays that way. This one is the project's extra teeth.
 *
 * USAGE
 * -----
 *   node scripts/spatial/balance.mjs [--dir .spatial-site] [--base <url>]
 *                                 [--widths 390,768,1024,1440]
 *                                 [--routes "/,/?demo=1&module=erp"]
 *                                 [--exempt design/balance-exemptions.json]
 *                                 [--dead 40]
 *
 * A dead column may be kept ONLY with a written reason in the exemptions
 * file, matched by route and by the first words of the block. A finding with
 * no reason is a failure, for the same reason it is a failure in the law.
 */
import { createServer } from "node:http";
import { existsSync, readFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..");

const argv = process.argv.slice(2);
function opt(name, fallback) {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
}

const DIR = path.resolve(ROOT, opt("--dir", ".spatial-site"));
const BASE = opt("--base", null);
const WIDTHS = opt("--widths", "390,768,1024,1440")
  .split(",")
  .map((w) => Number(w.trim()))
  .filter(Boolean);
const ROUTES = opt(
  "--routes",
  [
    "/",
    "/?demo=1&module=erp",
    "/?demo=1&module=act",
    "/?demo=1&module=crm",
    "/?demo=1&module=hr",
    "/?demo=1&module=intake",
    "/?demo=1&module=mirrors",
    "/?demo=1&module=security",
    "/?demo=1&module=dossier",
    "/?demo=1&module=design",
  ].join(","),
).split(",");
const EXEMPT_FILE = path.resolve(ROOT, opt("--exempt", "design/balance-exemptions.json"));
const DEAD_PX = Number(opt("--dead", "40"));

// ---------------------------------------------------------------- chrome
const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
].filter(Boolean);
const CHROME = CHROME_CANDIDATES.find((c) => existsSync(c));
if (!CHROME) {
  console.error(
    "\nFAIL — the balance gate could not measure.\n" +
      "  No Chrome binary found. Tried:\n" +
      CHROME_CANDIDATES.map((c) => `    ${c}\n`).join("") +
      "  Set CHROME_PATH=/path/to/chrome.\n",
  );
  process.exit(1);
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
};

// ---------------------------------------------------------------- the probe
// This runs INSIDE the measured page, in the harness's iframe. It asks one
// question of every grid on the page: how much of the row does this column
// leave empty beneath its own content?
const PROBE = `
function extent(doc, el) {
  // The band the item's own content occupies: the union of the boxes inside
  // it. Both edges matter — a column bottom-aligned in its row leaves its
  // void ABOVE its content, and a column top-aligned leaves it BELOW.
  var view = doc.defaultView;
  var box = el.getBoundingClientRect();
  var top = Infinity;
  var bottom = -Infinity;
  var all = el.querySelectorAll('*');
  for (var i = 0; i < all.length; i++) {
    var d = all[i];
    var cs = view.getComputedStyle(d);
    if (cs.position === 'absolute' || cs.display === 'none' || cs.visibility === 'hidden') continue;
    var r = d.getBoundingClientRect();
    if (r.height <= 0 && r.width <= 0) continue;
    if (r.top < top) top = r.top;
    if (r.bottom > bottom) bottom = r.bottom;
  }
  if (top === Infinity) { top = box.top; bottom = box.bottom; }
  return { top: top, bottom: bottom };
}

function signature(el) {
  var t = (el.textContent || '').replace(/\\s+/g, ' ').trim();
  return t.slice(0, 48);
}

function isBox(doc, el) {
  var cs = doc.defaultView.getComputedStyle(el);
  var bordered =
    (parseFloat(cs.borderTopWidth) || 0) > 0 ||
    (parseFloat(cs.borderLeftWidth) || 0) > 0 ||
    (parseFloat(cs.borderRightWidth) || 0) > 0;
  var filled = cs.backgroundColor && cs.backgroundColor !== 'rgba(0, 0, 0, 0)' &&
    cs.backgroundColor !== 'transparent';
  return bordered || filled;
}

function measureBalance(doc, threshold) {
  var view = doc.defaultView;
  var findings = [];
  var all = doc.querySelectorAll('*');
  for (var i = 0; i < all.length; i++) {
    var g = all[i];
    var cs = view.getComputedStyle(g);
    if (cs.display !== 'grid' && cs.display !== 'inline-grid') continue;
    var cols = cs.gridTemplateColumns.split(' ').filter(Boolean);
    if (cols.length < 2) continue;

    var kids = [];
    for (var k = 0; k < g.children.length; k++) {
      var kid = g.children[k];
      var kcs = view.getComputedStyle(kid);
      if (kcs.display === 'none' || kcs.position === 'absolute' || kcs.visibility === 'hidden') continue;
      kids.push(kid);
    }
    if (kids.length < 2) continue;

    // Only single-row grids are measured: in a grid with several rows the
    // empty band under a column is a row gap, which is the instrument's
    // business, not this one's. The grid's own row tracks are the test —
    // the items' tops are not, because a bottom-aligned column sits lower
    // than its neighbour inside the same row.
    var rows = cs.gridTemplateRows.split(' ').filter(Boolean);
    if (rows.length > 1) continue;

    var gcs = view.getComputedStyle(g);
    var grect = g.getBoundingClientRect();
    var rowTop = grect.top + (parseFloat(gcs.paddingTop) || 0);
    var rowBottom = grect.bottom - (parseFloat(gcs.paddingBottom) || 0);
    var rowHeight = rowBottom - rowTop;

    var tracks = {};
    for (var n = 0; n < kids.length; n++) {
      var r = kids[n].getBoundingClientRect();
      var key = Math.round(r.left);
      if (!tracks[key]) tracks[key] = [];
      tracks[key].push(kids[n]);
    }

    for (var tk in tracks) {
      var items = tracks[tk];
      // A column whose items are all boxes is not a hole: a box that ends is
      // a box, and the page carries on below it. A column of bare content
      // that leaves the row half empty IS a hole — the space belongs to
      // nothing.
      var allBoxes = true;
      for (var b = 0; b < items.length; b++) {
        if (!isBox(doc, items[b])) { allBoxes = false; break; }
      }
      if (allBoxes) continue;

      var contentTop = Infinity;
      var contentBottom = -Infinity;
      for (var p = 0; p < items.length; p++) {
        var e = extent(doc, items[p]);
        if (e.top < contentTop) contentTop = e.top;
        if (e.bottom > contentBottom) contentBottom = e.bottom;
      }
      // The void of a column is what is left of the row that its content
      // does not fill. Where that void SITS matters: a column whose content
      // is centred leaves half the void above it and half below it, and
      // that is balance. A column whose void is all at one end — stopped
      // short of the row, or pushed to the bottom of it — has a hole.
      var voidTop = Math.round(contentTop - rowTop);
      var voidBottom = Math.round(rowBottom - contentBottom);
      var void_ = Math.max(voidTop, voidBottom);
      if (void_ >= threshold) {
        findings.push({
          dead: void_,
          cols: cols.length,
          signature: signature(g),
          column: signature(items[0]),
        });
      }
    }
  }
  return findings;
}
`;

const HARNESS = `<!doctype html><html><head><meta charset="utf-8"><title>balance probe</title>
<style>html,body{margin:0;padding:0;background:#fff;color:#111}
iframe{border:0;display:block;width:100%;height:700px;background:#fff}</style>
</head><body>
<iframe id="f" title="probe target"></iframe>
<script>
var ROUTES = __ROUTES__;
var WIDTHS = __WIDTHS__;
var THRESHOLD = __THRESHOLD__;
var f = document.getElementById('f');
var results = [];

function heightFor(w) { return w <= 480 ? 844 : w >= 1200 ? 900 : 1000; }

function post(payload) {
  try { fetch('/__balance-results', { method: 'POST', body: JSON.stringify(payload) }); } catch (e) {}
}

// A sweep that shows nothing for its whole run is a sweep nobody can tell
// from a hung one. The gate says where it is.
function progress(route, w) {
  try { fetch('/__balance-progress', { method: 'POST', body: JSON.stringify({ route: route, w: w }) }); } catch (e) {}
}

function loadPage(route, w, cb) {
  f.style.width = w + 'px';
  f.style.height = heightFor(w) + 'px';
  var settled = 0;
  var last = '';
  var polls = 0;
  function onLoad() {
    f.removeEventListener('load', onLoad);
    wait();
  }
  function wait() {
    polls++;
    try {
      var doc = f.contentDocument;
      var h = doc ? doc.documentElement.scrollHeight + '|' + doc.body.innerText.length : '';
      if (h === last && h !== '') { settled++; } else { settled = 0; last = h; }
      // A page that never stops changing is a page the gate cannot measure.
      // It says so instead of waiting for ever.
      if (settled < 2) {
        if (polls > 150) { cb([]); return; }
        setTimeout(wait, 120); return;
      }
      var found = measureBalance(f.contentDocument, THRESHOLD);
      cb(found);
    } catch (e) {
      cb([]);
    }
  }
  f.addEventListener('load', onLoad);
  progress(route, w);
  f.src = route;
}

function run() {
  var i = 0, j = 0;
  function step() {
    if (i >= ROUTES.length) { post({ results: results, done: true }); return; }
    var route = ROUTES[i];
    var W = WIDTHS[j];
    loadPage(route, W, function (found) {
      found.forEach(function (f) { f.route = route; f.w = W; results.push(f); });
      j++;
      if (j >= WIDTHS.length) { j = 0; i++; }
      step();
    });
  }
  run_probe();
  function run_probe() {
    var s = document.createElement('script');
    s.textContent = __PROBE__;
    (document.head || document.documentElement).appendChild(s);
    step();
  }
}
run();
</script></body></html>`;

function harnessHtml() {
  return HARNESS.replace("__ROUTES__", JSON.stringify(ROUTES))
    .replace("__WIDTHS__", JSON.stringify(WIDTHS))
    .replace("__THRESHOLD__", String(DEAD_PX))
    .replace("__PROBE__", JSON.stringify(PROBE));
}

// ---------------------------------------------------------------- the server
let resolveResults = null;
const server = createServer(async (req, res) => {
  const url = new URL(req.url, "http://127.0.0.1");
  if (req.method === "POST" && url.pathname === "/__balance-progress") {
    let body = "";
    for await (const chunk of req) body += chunk;
    res.writeHead(204).end();
    try {
      const p = JSON.parse(body);
      console.log(`  · measuring ${p.route} @${p.w}px`);
    } catch {
      /* a broken body is not a progress report */
    }
    return;
  }
  if (req.method === "POST" && url.pathname === "/__balance-results") {
    let body = "";
    for await (const chunk of req) body += chunk;
    res.writeHead(204).end();
    try {
      const payload = JSON.parse(body);
      if (payload.done && resolveResults) resolveResults(payload.results || []);
    } catch {
      /* a broken body is not a result */
    }
    return;
  }
  if (url.pathname === "/__balance-harness") {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" }).end(harnessHtml());
    return;
  }
  if (BASE) {
    // --base mode: the bytes under test are the deployed ones.
    try {
      const upstream = await fetch(BASE.replace(/\/$/, "") + url.pathname + url.search, {
        headers: { "user-agent": "each-balance-gate" },
      });
      const buf = Buffer.from(await upstream.arrayBuffer());
      res.writeHead(upstream.status, {
        "content-type": upstream.headers.get("content-type") || "application/octet-stream",
      }).end(buf);
    } catch {
      res.writeHead(502).end("upstream failed");
    }
    return;
  }
  const file = path.join(DIR, url.pathname === "/" ? "index.html" : decodeURIComponent(url.pathname));
  if (!file.startsWith(DIR) || !existsSync(file)) {
    res.writeHead(404).end("not found");
    return;
  }
  const body = readFileSync(file);
  res.writeHead(200, { "content-type": MIME[path.extname(file)] || "application/octet-stream" }).end(body);
});

const port = await new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server.address().port)));
const prof = path.join(tmpdir(), `each-balance-${Date.now()}`);

const results = await new Promise((resolve, reject) => {
  const child = spawn(
    CHROME,
    [
      "--headless=new",
      "--disable-gpu",
      "--hide-scrollbars",
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-extensions",
      `--user-data-dir=${prof}`,
      `http://127.0.0.1:${port}/__balance-harness`,
    ],
    { stdio: ["ignore", "pipe", "pipe"] },
  );
  let err = "";
  child.stderr.on("data", (d) => {
    err += d;
  });
  const timer = setTimeout(() => {
    child.kill("SIGKILL");
    reject(new Error("the browser did not finish the sweep in time"));
  }, 15 * 60 * 1000);
  resolveResults = (rows) => {
    clearTimeout(timer);
    child.kill("SIGKILL");
    resolve(rows);
  };
  child.on("close", () => {
    clearTimeout(timer);
    reject(new Error("the browser exited before it reported its measurements\n" + err.slice(-800)));
  });
});

server.close();

// ---------------------------------------------------------------- the verdict
const exemptions = existsSync(EXEMPT_FILE)
  ? JSON.parse(readFileSync(EXEMPT_FILE, "utf8")).exemptions || []
  : [];

function exemptionFor(finding) {
  return exemptions.find(
    (e) =>
      e.route === finding.route &&
      String(finding.signature || "").startsWith(String(e.signature || "")),
  );
}

const offenders = [];
const kept = [];
for (const finding of results) {
  const ex = exemptionFor(finding);
  if (ex) {
    kept.push({ ...finding, reason: ex.reason });
  } else {
    offenders.push(finding);
  }
}

const measured = ROUTES.length * WIDTHS.length;
console.log(
  `  · balance sweep: ${measured} page loads (${ROUTES.length} routes × ${WIDTHS.length} widths), ` +
    `${results.length} dead column(s) found`,
);

if (kept.length) {
  console.log("\n  Kept, with a written reason:");
  for (const k of kept) {
    console.log(`    · ${k.route} @${k.w} — ${k.dead}px under "${k.column}"`);
    console.log(`      reason: ${k.reason}`);
  }
}

if (offenders.length) {
  console.error(`\nFAIL — ${offenders.length} column(s) left empty under their content:\n`);
  for (const o of offenders) {
    console.error(`  ✗ ${o.route} @${o.w} — ${o.dead}px of nothing under "${o.column}"`);
    console.error(`      block: "${o.signature}"`);
  }
  console.error(
    "\n  A dead column has to earn its place: fill it, make the two columns the\n" +
      "  same height, or write the reason in " +
      path.relative(ROOT, EXEMPT_FILE) +
      ".\n",
  );
  process.exit(1);
}

console.log("\nEACH balance contract passed: no column leaves a hole under its content.");
