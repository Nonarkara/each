#!/usr/bin/env node
/**
 * THE CLIP GATE — a control whose own label does not fit its own box.
 *
 * WHY THIS EXISTS
 * ---------------
 * The MSH instrument measures a page against a receipt: every hole, orphan,
 * wrap and clip is compared with what the baseline recorded, and a new one
 * fails until somebody writes a reason for it. That works — and it is blind
 * to one class, because that class is not a clip the instrument can see.
 *
 * The instrument's clip rule is: an element whose `overflow-x` is hidden or
 * clip, and which hides more than 2px of its own content. A control does
 * not hide anything — a button has `overflow: visible` — so a label that
 * does not fit its button SPILLS out of it, and the neighbour that stands
 * next to it paints over the spill. The reader sees a word cut in half:
 * the Thai on the language switch read "โน" with the last letter painted
 * over by the button beside it, on a phone, on every page of the product.
 *
 * Nothing overflows. Nothing is clipped by the instrument's definition. No
 * element is an orphan. The page passes every rule the instrument knows and
 * shows a broken word.
 *
 * So this gate measures exactly that: for every route at every width, does
 * every control's own content fit inside the control?
 *
 * It is the project's own script, not the law's instrument: the instrument is
 * byte-identical and stays that way. This one is the project's extra teeth.
 *
 * USAGE
 * -----
 *   node scripts/spatial/clip.mjs [--dir .spatial-site] [--base <url>]
 *                              [--widths 390,768,1024,1440]
 *                              [--routes "/,/?demo=1&module=erp"]
 *                              [--exempt design/clip-exemptions.json]
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
const EXEMPT_FILE = path.resolve(ROOT, opt("--exempt", "design/clip-exemptions.json"));

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
    "\nFAIL — the clip gate could not measure.\n" +
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
  ".mp3": "audio/mpeg",
  ".mp4": "video/mp4",
};

// ---------------------------------------------------------------- the probe
// This runs INSIDE the measured page, in the harness's iframe. It asks one
// question of every control on the page: does your own content fit inside
// you?
const PROBE = `
function labelOf(el) {
  var t = (el.textContent || '').replace(/\\s+/g, ' ').trim();
  if (!t) {
    var v = el.value || el.getAttribute('aria-label') || el.getAttribute('title') || '';
    t = String(v).replace(/\\s+/g, ' ').trim();
  }
  return t.slice(0, 40);
}

function isControl(el) {
  var tag = el.tagName;
  if (tag === 'BUTTON' || tag === 'A' || tag === 'SUMMARY' || tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return true;
  return el.getAttribute && el.getAttribute('role') === 'button';
}

// A region the reader is meant to scroll is not a defect: the content is
// there, and the reader scrolls to it. A control is not a scroll region.
function insideScroller(el) {
  var node = el.parentElement;
  while (node && node !== document.body) {
    var cs = getComputedStyle(node);
    if (cs.overflowX === 'auto' || cs.overflowX === 'scroll') return true;
    node = node.parentElement;
  }
  return false;
}

function measureClip(doc) {
  var findings = [];
  var all = doc.querySelectorAll('*');
  for (var i = 0; i < all.length; i++) {
    var el = all[i];
    if (el === doc.body || el === doc.documentElement) continue;
    var cs = doc.defaultView.getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    var r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;

    var control = isControl(el);
    var hides = cs.overflowX === 'hidden' || cs.overflowX === 'clip';
    var scrolls = cs.overflowX === 'auto' || cs.overflowX === 'scroll';

    // A REGION THAT CUTS ITS CONTENT. A table wider than the phone is not a
    // table: the reader sees the last column cut in half, a number split down
    // the middle, and nothing saying there is more to the right. A board — a
    // pipeline of columns — is the one thing that may scroll sideways, and
    // it says so in the exemptions file.
    if (scrolls && el.clientWidth > 8 && el.scrollWidth > el.clientWidth + 2) {
      var head = '';
      var ths = el.querySelectorAll('th');
      for (var t2 = 0; t2 < ths.length; t2++) {
        if (head) head += ', ';
        head += (ths[t2].textContent || '').trim();
      }
      if (!head) head = (el.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 60);
      findings.push({
        kind: 'cut content',
        sel: el.tagName.toLowerCase() + (el.querySelector('table') ? '.table' : '.board'),
        over: el.scrollWidth - el.clientWidth,
        label: head,
        text: head,
      });
    }

    if (!control && !hides) continue;
    if (el.clientWidth <= 8) continue;

    // The content that does not fit.
    var over = el.scrollWidth - el.clientWidth;
    if (over <= 2) continue;

    // A control inside a region the reader scrolls is a control that fits
    // its region; the region scrolls. That is the reader's own scroll.
    if (control && insideScroller(el)) continue;

    var name = el.tagName.toLowerCase();
    if (el.className && typeof el.className === 'string') {
      name += '.' + el.className.trim().split(/\\s+/).slice(0, 3).join('.');
    }
    findings.push({
      kind: control ? 'spilled control' : 'clipped content',
      sel: name,
      over: over,
      label: labelOf(el),
      text: (el.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 60),
    });
  }
  return findings;
}
`;

const HARNESS = `<!doctype html><html><head><meta charset="utf-8"><title>clip gate</title>
<style>html,body{margin:0;padding:0;background:#111;color:#eee}iframe{border:0;display:block;background:#fff}</style>
</head><body>
<iframe id="f" title="clip target"></iframe>
<script>
var ROUTES = __ROUTES__;
var WIDTHS = __WIDTHS__;
var f = document.getElementById('f');
var results = [];

function heightFor(w) { return w <= 480 ? 844 : w >= 1200 ? 900 : 1000; }

function post(payload) {
  try { fetch('/__clip-results', { method: 'POST', body: JSON.stringify(payload) }); } catch (e) {}
}
function progress(route, w) {
  try { fetch('/__clip-progress', { method: 'POST', body: JSON.stringify({ route: route, w: w }) }); } catch (e) {}
}

function loadPage(route, w, cb) {
  f.style.width = w + 'px';
  f.style.height = heightFor(w) + 'px';
  var settled = 0;
  var last = '';
  var polls = 0;
  function onLoad() { f.removeEventListener('load', onLoad); wait(); }
  function wait() {
    polls++;
    try {
      var doc = f.contentDocument;
      var h = doc ? doc.documentElement.scrollHeight + '|' + doc.body.innerText.length : '';
      if (h === last && h !== '') { settled++; } else { settled = 0; last = h; }
      if (settled < 2) {
        if (polls > 150) { cb([]); return; }
        setTimeout(wait, 120); return;
      }
      var found = measureClip(f.contentDocument);
      cb(found);
    } catch (e) { cb([]); }
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
      found.forEach(function (x) { x.route = route; x.w = W; results.push(x); });
      j++;
      if (j >= WIDTHS.length) { j = 0; i++; }
      step();
    });
  }
  var s = document.createElement('script');
  s.textContent = __PROBE__;
  (document.head || document.documentElement).appendChild(s);
  step();
}
run();
</script></body></html>`;

function harnessHtml() {
  return HARNESS.replace("__ROUTES__", JSON.stringify(ROUTES))
    .replace("__WIDTHS__", JSON.stringify(WIDTHS))
    .replace("__PROBE__", JSON.stringify(PROBE));
}

// ---------------------------------------------------------------- the server
let resolveResults = null;
const server = createServer(async (req, res) => {
  const url = new URL(req.url, "http://127.0.0.1");
  if (req.method === "POST" && url.pathname === "/__clip-progress") {
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
  if (req.method === "POST" && url.pathname === "/__clip-results") {
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
  if (url.pathname === "/__clip-harness") {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" }).end(harnessHtml());
    return;
  }
  if (BASE) {
    try {
      const upstream = await fetch(BASE.replace(/\/$/, "") + url.pathname + url.search, {
        headers: { "user-agent": "each-clip-gate" },
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
const prof = path.join(tmpdir(), `each-clip-${Date.now()}`);

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
      `http://127.0.0.1:${port}/__clip-harness`,
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
    reject(new Error("the browser exited before it reported\n" + err.slice(-400)));
  });
});
server.close();

// ---------------------------------------------------------------- the verdict
let exempts = [];
try {
  if (existsSync(EXEMPT_FILE)) {
    const raw = JSON.parse(readFileSync(EXEMPT_FILE, "utf8"));
    exempts = Array.isArray(raw) ? raw : raw.exempt || [];
  }
} catch {
  exempts = [];
}

function exempted(f) {
  for (const e of exempts) {
    if (e.route && e.route !== f.route) continue;
    if (e.sel && e.sel !== f.sel) continue;
    if (e.w !== undefined && e.w !== null) {
      const ws = (Array.isArray(e.w) ? e.w : [e.w]).map(Number);
      if (!ws.includes(Number(f.w))) continue;
    }
    return e;
  }
  return null;
}

const failures = [];
for (const f of results) {
  const ex = exempted(f);
  if (ex) {
    console.log(`  · ${f.route} @${f.w}px — ${f.kind}: ${f.sel} — exempt: ${ex.why}`);
    continue;
  }
  failures.push(
    `  ✗ ${f.route} @${f.w}px — ${f.kind}: ${f.sel} does not fit (${f.over}px over)` +
      `${f.text ? ` — "${f.text}"` : ""}`,
  );
}

const loads = ROUTES.length * WIDTHS.length;
if (failures.length) {
  console.error(`\nFAIL — ${failures.length} thing(s) do not fit, over ${loads} page loads:\n`);
  for (const line of failures.slice(0, 40)) console.error(line);
  if (failures.length > 40) console.error(`  ... and ${failures.length - 40} more`);
  console.error(
    `\n  A label that does not fit its control is a word cut in half, and a region\n` +
      `  that cuts its content is a column cut off. Fix it, or write the reason it\n` +
      `  may stay in ${path.relative(ROOT, EXEMPT_FILE)}.\n`,
  );
  process.exit(1);
}

console.log(
  `\nEACH clip contract passed: ${loads} page loads, every control's own label fits its own box.\n`,
);
