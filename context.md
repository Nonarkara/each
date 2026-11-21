# EACH — project context

## Identity

| Field | Value |
|-------|-------|
| **Name** | EACH — Dr Non's No-Brainer Complete Startup/SME Management Tool |
| **Acronym** | **E**RP · **A**CT · **C**RM · **H**R |
| **Taglines** | "Every piece of your startup, unified." / "One system. Every metric. Zero chaos." |
| **Repo path** | `/Users/nonarkara/Projects/each` |
| **GitHub** | https://github.com/nonarkara/each |
| **Predecessor** | `/Users/nonarkara/Projects/CRM2` (AXIOM prototype, static HTML/JS) |
| **Created** | 2026-06-27 |
| **Phase** | 1 — clone-and-run Frappe/MariaDB path added; production hardening pending |

## Ikigai mock data sources

| Path | Path | What it contains |
|------|------|------------------|
| **Axiom (auth)** | `dashboards/ikigai and co/data/tenant_ikigai.json` | Axiom X Co., Ltd. — funding, projects, opex/capex, investor brief |
| **ABC (demo)** | `dashboards/ikigai and co/data/tenant_sic.json` | ABC Company Limited — Siam InnoCity failing startup, audited FY2025 |
| Prior port | `CRM2/js/demo.js` | CRM2 lineage |
| Research docs | `ikigai-finance-engine/README.md` | ABC Company fictitious tenant description |

EACH stores: `src/data/axiom-mock.ts` (auth path) · `src/data/abc-mock.ts` (demo path)

### Finance number reconciliation (Axiom)

| Metric | Ikigai `tenant_ikigai.json` | EACH `calcFinance()` |
|--------|----------------------------|----------------------|
| Called capital | ฿800,000 | ฿800,000 |
| Revenue received | ฿97,000 | ฿97,000 |
| CapEx to date | ฿202,000 (Mac + AppleCare) | ฿202,175 (+ ฿175 Jun Cloudflare opex in ledger) |
| Cash (static) | ฿695,000 (cap table) | ฿694,825 |
| Monthly burn (Jun 2026) | ฿38,775 recurring opex sum | ฿38,775 (AI ฿19,600 + Mac installment ฿19,000 + opex ฿175) |
| Runway (static) | ~18 mo at static cash/burn | 17 mo (floor) |

**Root cause of ฿175 cash delta:** EACH records Jun Cloudflare opex (฿175) in `expenses`; Ikigai static capex sum excludes operating receipts. **Runway delta vs Ikigai dashboard:** Ikigai API builds a **month-by-month time series** with scheduled pipeline installments; EACH uses point-in-time conservation at `asOf`.

## Auth (Phase 0)

| Provider | Client env | Server secret |
|----------|------------|---------------|
| Google GIS | `VITE_GOOGLE_CLIENT_ID` | None — JWT verified client-side |
| GitHub OAuth | `VITE_GITHUB_CLIENT_ID`, `VITE_GITHUB_REDIRECT_URI` | `GITHUB_CLIENT_SECRET` on Cloudflare Pages only |

Cloudflare Pages Function: `functions/api/auth/github.js` exchanges OAuth code.  
Demo path (`ABC`) skips OAuth — session flagged `demo: true` in sessionStorage (8 h TTL).

> **Security Note (Phase 0):** Auth is currently client-state only and performs zero server-side authorization. It is used strictly to gate mock data sets locally. In Phase 2, this will be replaced with server-side validation via Frappe session cookies. Additionally, Phase 0 stores PII (e.g., salaries, tax IDs) unencrypted in `localStorage`. This architectural trade-off will also be resolved in Phase 2 by migrating data off `localStorage` to a secured Frappe REST API.

## Human manual & Google Sheets

| Resource | Path | Status |
|----------|------|--------|
| **Founder manual** | [`docs/MANUAL.md`](docs/MANUAL.md) | Live — Sheets-first workflow |
| **Tab schema** | [`docs/sheets/tab-schema.json`](docs/sheets/tab-schema.json) | 10 tabs defined |
| **Apps Script** | [`sheets/apps-script.gs`](sheets/apps-script.gs) | Copy into Google Sheet |
| **CSV headers** | [`docs/sheets/*.csv`](docs/sheets/) | Import templates |
| **Live template URL** | *(pending Dr Non Google account)* | Deploy script → paste Web App URL |

## Live URLs

| URL | Status |
|-----|--------|
| GitHub Pages | https://nonarkara.github.io/each/ (live; relative asset base `./`) |
| Custom domain | https://each.nonarkara.org — GitHub Pages CNAME set; **Cloudflare DNS pending** — run `export CF_TOKEN=… && bash scripts/dns-setup.sh` |

## Module definitions

- **E · ERP** — Finance, inventory, operations. Cash, burn, runway, CapEx/OpEx, OKR, revenue pipeline.
- **A · ACT** — Accounting & actions. Invoices, expense ledger, action queue (derived + manual).
- **C · CRM** — Customers, pipeline, deals. Kanban, checklists, file logs, operator reads.
- **H · HR** — People, payroll, leave. Human roster + AI operators as employees.

## Design system

| Token | Value |
|-------|-------|
| Display font | Jost |
| Body font | Source Sans 3 |
| Thai font | IBM Plex Sans Thai |
| Mono font | JetBrains Mono |
| Accent | `#f59e0b` (amber — one accent only, never body text) |
| Paper | `#f6f5f2` |
| Panel | `#ffffff` |
| Ink | `#191712` (16.43:1 on paper) |
| Ink 2 | `#5f5b52` (6.20:1 on paper) — one secondary tone |
| Rule / hairline | `#cfcbc0` (2px boundary) / `#e4e1d8` (1px peer) |
| Corners | `0` — no border-radius except true circles |
| Layout | Mobile-first, 44px tap targets, hairline grids |

## Architecture

```
Offline:   Vite/React + localStorage cache (storeApi in src/lib/store.ts)
Product:   account service in server/ — accounts, server sessions, per-account workspace
           (src/services/account.ts + src/services/workspaceSync.ts, same each_backend.api.* contract)
Local:     Frappe v15 + MariaDB persistence via the same client, VITE_FRAPPE_URL
Phase 1.5: Stub services — company lookup, Gmail OAuth, OCR scan
Phase 2:   Native ERPNext + Frappe HR + Frappe CRM DocType mapping
```

**Swap point:** `storeApi` in `src/lib/store.ts` and `frappeClient` in `src/services/api.ts`. UI modules call `useStore()` / `storeApi` only — no direct localStorage in components. The current Frappe bridge stores one authenticated JSON workspace per user so the database path works before native DocType mapping is complete.

### Phase 2 Frappe plan

1. Deploy Frappe bench with ERPNext, Frappe HR, Frappe CRM apps on MariaDB.
2. Map EACH entities:
   - `foundingCapital` + `expenses` → ERPNext Accounting (Journal Entry, Payment Entry)
   - `projects` + deal fields → Frappe CRM (Deal, Project)
   - `employees` + `aiEmployees` → Frappe HR (Employee, custom "AI Operator" doctype)
   - `objectives` → ERPNext Goal / custom OKR doctype
3. Replace `storeApi.get/set/update` with `frappeClient` REST calls (`each.api.get_state`, `each.api.patch_state`).
4. Keep `calcFinance()` client-side for cockpit vitals OR move to server method for single source of truth.
5. Auth: Frappe session cookie or API key per site; no secrets in repo.

Do **not** plan around EspoCRM or Frappe Books.

## Commands

```bash
npm run dev      # local dev server
npm run build    # production build
npm run preview  # preview production build
```


## Git / deploy (2026-06-28)

| Item | Value |
|------|-------|
| **Canonical branch** | `main` — React/Vite app (`fa0e024` → `c5d821b` → `8d06c0f` line) |
| **Replaced on remote** | Unrelated static CRM2 tree at `origin/main` `b29407c` (no merge-base); Cloudflare Pages workflow removed in favour of GitHub Pages |
| **Deploy CI** | `.github/workflows/deploy.yml` — GitHub Pages (`npm ci` + `npm run build`, artifact `dist/`) |
| **HEAD after reconcile** | `647b8a8` — feat Axiom mock (`95f0bbe`) + scroll fix (2026-06-28) |

## Deployment

- **Static:** GitHub Pages via `.github/workflows/deploy.yml` (push to `main`)
- **Domain:** `each.nonarkara.org` → CNAME to `nonarkara.github.io` (Cloudflare DNS)
- **CNAME file:** `public/CNAME`

## Ported from CRM2 (live)

| CRM2 | EACH |
|------|------|
| `data.js` | `src/lib/store.ts` + `src/lib/format.ts` |
| `erp.js` calc + finances UI | `src/lib/calc.ts` + `src/modules/erp/ErpModule.tsx` |
| `hr.js` | `src/modules/hr/HrModule.tsx` |
| `crm.js` kanban | `src/modules/crm/CrmModule.tsx` |
| `onboarding.js` | `src/modules/onboarding/Onboarding.tsx` |
| `demo.js` | `src/lib/demo.ts` + `src/data/axiom-mock.ts` |
| `app.js` dossier | `src/modules/dossier/DossierView.tsx` |
| Expense ledger (was ERP) | `src/modules/act/ActModule.tsx` |

## Stubbed (Phase 1 — needs API keys)

| Feature | Service | Env var | Current behaviour |
|---------|---------|---------|-------------------|
| AI company lookup | `src/services/companyLookup.ts` | `VITE_COMPANY_LOOKUP_API` | Local registry sim (0105566000000) |
| Gmail OAuth | `src/services/gmail.ts` | `VITE_GOOGLE_CLIENT_ID`, `VITE_GOOGLE_REDIRECT_URI` | Simulated receipt import |
| OCR scan | `src/services/ocr.ts` | `VITE_OCR_API_URL` | Simulated Tax ID + capital extraction |
| Google Sheets sync | `src/services/sheets.ts` | `VITE_SHEETS_WEB_APP_URL` | localStorage + optional two-way Apps Script |

See `.env.example` for placeholders. Never commit `.env`.

## Secrets

None configured. Reference `shared/.secrets-backup/` for workspace key locations when wiring Phase 1 live APIs.

## Intake and mirrors design read (2026-10-04)
A founder should be able to trace every proposed entry to a document, correct it, and file only what they approved. Reference: Braun ET66 for legible controls and Palette's Bauhaus Human Design for content-led composition. Document review is the dominant surface; connection details use progressive disclosure. Section boundaries use 2px rules; record relationships use 1px hairlines. English uses Josefin Sans / Source Sans 3; Thai uses non-looped IBM Plex Sans Thai; data uses JetBrains Mono. No accent added beyond amber. Fluent human Thai review is still needed.

## Reviewed intake and mirror implementation (2026-10-05)
- New routes: Add document and Data mirrors; ERP/ACT/CRM/HR/dossier remain.
- Optional browser OCR downloads English/Thai language assets without sending document images to a service. AI uses a user-selected OpenAI-compatible endpoint; session-only API key never enters the store.
- Explicit user request for local LLM integration authorizes the visible loopback endpoint preset in the public bundle. It is used only after the user chooses it and requests analysis.
- Hippocampus is an approval/source ledger, not a vector database; approved records remain in their respective collections.
- Excel export/import includes source receipts; Google Apps Script transfers are now explicit with optimistic conflict detection and read-back.
- Authenticated Frappe Google Sheets/Graph connectors are configured per user; credentials are environment-only. Real provider-account transfer is not yet verified.
- Pilot posture: no production/multi-tenant maturity claim.

## Verified hosting route (2026-10-05)

GitHub Pages CI is green, but the custom domain actually routes to the existing
Cloudflare Pages project `each` (`each-c3p.pages.dev`). The old deployment there
continued serving July assets after new GitHub Pages builds succeeded. Deploy the
same tested `dist/` with `wrangler pages deploy dist --project-name each --branch main`.
Verify the custom-domain index asset names against `dist/index.html`; checking only
GitHub Actions misses this split. GitHub's origin was independently checked over
HTTP with the custom Host header; the public HTTPS route remains Cloudflare.


## Palette design receipt (2026-10-05)

DesignRead: a founder opens EACH on a phone to find the next cash decision or file
an approved document; competing oversized figures and repeated coded labels slow
that scan. The surface operates a company workspace. Palette's content-led
Bauhaus composition and contextual typography inform hierarchy, not a new skin.
Reference artifact: Palette's own skills and Braun ET66's distinction between
operation labels and numeric readout. DESIGN_VARIANCE=3, MOTION_INTENSITY=1,
VISUAL_DENSITY=5 (ten-point scales; working intentions, not quality scores).

Chosen composition: one desktop navigation rail; company context and cash vitals
remain visible in a separate scrolling summary; runway retains the main financial
readout, supporting amounts form compact definition lists. Rejected alternative:
an expanded sidebar and equally large metric tiles consume the phone's opening
view without improving the cash decision. All modules, kanban, roster, charts,
intake approval, mirror review, backups and security checks are conserved.

Josefin remains the display voice, Source Sans 3 carries English labels and prose,
IBM Plex Sans Thai carries Thai text, JetBrains Mono is reserved for numeric/data
readouts. Section headings use body-size emphasis; a 2px rule marks the page and
backup workflow, 1px rules mark peer records. Amber marks the primary action and
selected module; risk remains legible in ink with a textual status. No new accent,
font, animation library or decorative asset. Fluent Thai and uninstructed human
usability review remain unverified.


Mechanical proof: 19 TypeScript tests and 12 backend tests pass; lint, build and
EACH's design contract pass. Browser proof at 390px (Thai) shows no horizontal
page overflow; the desktop header measures 65px including its rule. Rendered
controls have 0px corners and no box shadows. Search opens with focused input;
Thai search for PDF followed by Enter reaches document intake and restores focus.
The generic axiom-audit strict scan does not pass: it treats permitted display
bold, explanatory arrows, Tailwind preflight variables and bundled PDF/Excel
library colours as violations. These are recorded exceptions, not a claim of a
clean generic audit; EACH's explicit contract and actual rendered geometry govern.


## Product tier and spatial audit (2026-10-23)

**Shipability audit — found.** No account system: only an admin-configured Google
allowlist or a browser-only workspace; data lived in `localStorage`; sessions were
client-state only; nothing served an API, so there was no URL a startup could sign
up at. **Changed.** `server/` (account service): email + password with scrypt
hashing, server-side sessions in an `HttpOnly` cookie, CSRF on writes, per-account
workspace rows, rate limits that count failed attempts only, and one process that
serves the built app and the API on one origin. The client speaks the same
`each_backend.api.*` contract as the Frappe app, so `VITE_FRAPPE_URL` still swaps
the backend without touching the UI. **Verified.** 23 server tests pass; a browser
run created an account, completed onboarding, recorded an expense, confirmed the
server held `onboarded: true` and the expense, signed out, signed back in, and saw
the expense again — no console errors.

**MSH pass.** Measured at 390, 1024 and 1440 across login and all eight routes.
Found: a three-band mobile header (155px, 18% of the viewport), a repeated
three-line evaluation banner on every page, redundant storage and Sheets status
lines, 18px checkboxes, 40px link buttons. Changed: two bands (identity + actions,
then module navigation with the language switch), 111px header (13%), the
workspace notice reduced to one status line, 44px tap targets. Verified: no
horizontal overflow, no element outside the viewport outside a deliberate scroll
container, no tap target under 44px, text sizes only 11/14/32, no console errors
across 24 route × viewport combinations.

**Palette × Dieter Rams.** Tokens renamed by role, not by hue: `paper`, `panel`,
`ink`, `ink-2`, `rule`, `hairline`, `amber` — seven, no more. The two near
identical greys (`ink-2`, `ink-3`) collapsed into one secondary ink at 6.20:1 on
paper; the two line tokens became `rule` (2px boundary) and `hairline` (1px peer);
amber is now a surface and an edge only, and the three places that printed amber
body text were corrected. `scripts/check-design.mjs` enforces the token count, the
role names, the single accent, and the no-amber-as-text rule.

**Type.** Jost replaces Josefin Sans as the display voice; Source Sans 3 still
carries English prose, IBM Plex Sans Thai still carries Thai, JetBrains Mono still
carries data. Josefin Sans was removed from the bundle and from the contract.

**Unverified.** Fluent Thai review of the new account screens; real provider
OAuth for the account service; a multi-user team model; email verification and
password reset; internet-facing deployment hardening (TLS, backups, monitoring).


## Anti-slop pass (2026-10-23, second pass)

The complaint was that the delivered screens looked AI-generated and spatially
hallucinated. The first pass had measured geometry and fixed it; it had not
removed the writing.

**Found.** Every module opened with a paragraph explaining what the module is.
The ERP cockpit carried a "Benchmarks" block with medians nobody had measured
(source unverified) and fake OKRs the founder never wrote. The sign-in page was a
card floating in a 1440px void; its bottom row pushed "What is EACH?" to the far
left and an account note to the far right with a void between them. Each module
page repeated the tenant name at the bottom, an orphan duplicating the header.
Kanban cards set the title and the amount on one baseline, so a wrapped title
collided with the amount. Action rows printed a bare lowercase module word. The
baht sign `฿` was typed into ten data strings and rendered as tofu: the loaded
faces have no glyph for it.

**Changed.** All module paragraphs deleted; the dossier keeps its prose because
it is an exported document, not chrome. Invented numbers deleted rather than
labelled. Objectives render only when the founder has own objectives. Sign-in
recomposed as a two-column poster with the account note inside the form panel and
a three-cell band for the no-account paths. The orphan tenant line deleted. Kanban
cards: title on its own line, amount right-aligned on the meta row. Module words
are tags. `฿` replaced by `THB`, amounts still come from `money()`.

**Verified.** `npm run build`, `npm run lint`, `npm run check:design`, `npm test`
(22) and `npm run test:server` (23) pass. The design contract now fails any
`<p>` over 200 characters in a module and any typed baht sign, so both cannot
return silently. Screens captured at 390, 1024 and 1440 are in
`docs/images/msh-2026-10-23/`.

**Unverified.** Dr Non has not yet ruled on the redesigned screens; the Frappe
backend path is still unrun locally (Docker down, Python 3.9).


## Deployment receipt (2026-10-23)

**Two hosts, one public route.** `each.nonarkara.org` is served by the Cloudflare
Pages project `each` (`each-c3p.pages.dev`); `nonarkara.github.io/each/` carries
a `CNAME` for the same domain and redirects to it. The Cloudflare project has
**no Git integration** (`Git Provider: No`), so a push to `main` does not
rebuild it: its last deployment was ad-hoc, from commit `60db108`, two weeks
old. The live route was therefore still serving the pre-redesign build.

**The GitHub Pages workflow failed first.** `deploy.yml` runs
`npm audit --audit-level=high` before building, and the tree failed it: vite
8.0.0–8.1.5 (launch-editor argument escape, `server.fs.allow`, cross-origin
script execution through custom middleware) and source-map-js 1.0.0–1.2.1
(event-loop denial of service). `npm audit fix` moved the lockfile to the
patched releases — 0 vulnerabilities — and the workflow then passed.

**Published.** `git push origin main`, then `wrangler pages deploy dist
--project-name each --branch main`. Verified in a browser against the public
URL, not the workflow status: the served bundle is `index-Q_3k_zst.js`, the
Benchmarks block and the filler objective are absent from the rendered page at
1440 and 390, the baht tofu is gone, and the only console messages are
fontsource data-URI notices.

**Still static.** The published site is the evaluation tier: the workspace
lives in `localStorage`. The account tier needs the Node service
(`npm run product` or the container); Cloudflare Pages hosts no API. Because
there is no account service there, the sign-in panel states that the
deployment has no accounts and offers "Continue on this device" as the action,
instead of rendering an empty form box.


## MSH gate pass (2026-10-24)

**The instrument, not an opinion.** `docs/msh-law.md` is Dr Non's spatial law,
vendored verbatim. `scripts/spatial/` is the instrument that enforces it,
vendored byte for byte from the skill that owns it — `npm run check:instrument`
proves the hashes. Both the gate and the falsifier run in CI (`spatial` job:
`check:instrument` → `check:spatial` → `check:spatial:false`), so a page that
invents a reason to occupy space cannot reach production, and a gate that
stops biting fails the build too.

**Found.**

1. *The gate was measuring the wrong thing.* Hash routes (`#/erp`) are
   invisible to the instrument, which identifies a load by a token in
   `location.search`; the harness served files by path, and every measurement
   landed back on the sign-in wall. Routing moved into the query
   (`/?demo=1&module=erp`), which is the same URL for a person and for the
   gate. The promise — nine routes × six widths — became 54 measurements, then
   171 once the CSS breakpoints were swept.
2. *The sweep never saw the breakpoints.* The instrument reads cliffs in the
   legacy `(min-width:)` syntax; the build emits the modern range syntax
   `(width >= 40rem)`, so the stylesheet was not found and the sweep fell back
   to the widths somebody had listed. `scripts/spatial/prepare-site.mjs` now
   reads the real cliffs out of the built CSS and states them where the
   instrument can read them: 19 widths, every cliff ±1px.
3. *A wordmark broken in half.* At 360px the masthead column is 94px wide;
   the tenant label beside "EACH" pushed the wordmark out of its own column
   and `overflow-wrap` broke it into "E" / "ACH". The masthead now names two
   things and stops (the product, the workspace); the tenant, the storage
   state and the account moved into the state band under the numbers.
4. *The chrome grew 28px* at 360px (111 → 139) for a name that was then cut
   in half by `truncate`. It is now 119px with nothing cut: the Tools menu is
   a 44px icon below 640px, and the company name wraps instead of hiding.
5. *A client name that hid 78px of itself.* The CRM board ran four columns
   from 1024px, so a card was 200px wide and the client's name was truncated
   to fit. The board is two columns until 1280px, and the name wraps.
6. *The sign-in page had no primary action.* On the static tier — the tier the
   deployed site actually serves — every button was an outline, so the page
   had no loud control: the law's "first thing you can do" was nothing at all.
   The CTA is now the amber filled button, and the page is inside a `<main>`
   landmark, which it was missing entirely.
7. *A relative build base.* `base: './'` broke any copy of `index.html`
   served from a subdirectory: the script 404s, the page is blank, and a
   blank page measures as nothing. The base is absolute now.
8. *A bar with unnamed segments.* "Where the burn goes" drew three segments
   over rows that carried no swatch, so a reader could not name what the
   colours meant. The rows wear the colour of their segment.

**Changed.** The masthead, the vitals strip, the CRM board, the sign-in
panel, the burn composition, the routing, the build base, and the CI. Every
hole the gate reported is either gone or written down with a reason in
`design/spatial-baseline.json` — the receipt names what it saw at every route
and every width.

**Verified.** `npm run check:spatial` passes: **171 measurements — 9 routes ×
19 widths — zero findings**, every one of them a fresh load at the width
measured, on a real clock. `npm run check:spatial:false` passes: **10 injected
page defects, 12 broken-baseline cases and 1 case about the instrument itself,
all caught; 8 of 8 modes.** `npm run check:design` passes, `npm test` (22) and
`npm run test:server` pass, `npm run build` passes.

**Remaining.** The gate measures the built site; the deployed site was
re-measured after the upload and the receipt is in the deployment section
below. Dr Non has not yet ruled on the recomposed screens. Frappe is still
unrun locally (Docker down, Python 3.9), so the Node account service remains
the verified tier.


## Deployment receipt (2026-10-24, MSH release)

**Published from the commit.** `e5c4c72`, built in a pristine `git worktree`
export of that commit — not from the working tree — and uploaded with
`wrangler pages deploy dist --project-name each --branch main
--commit-hash e5c4c72`. The public route serves `index-BbxRXUhi.js`, and the
deployed `index.html` is **byte-identical** to the built one (sha256 compared
by `scripts/spatial/fetch-deployed.mjs`).

**Measured, three ways.**

1. **The built site** — `npm run check:spatial`: **189 measurements, 9 routes ×
   21 widths, zero findings.** The widths are the six project widths, every
   CSS breakpoint and its two neighbours, and the phone widths the law names
   (390, 414). Every measurement is a fresh load at the width measured.
2. **The deployed bytes** — `npm run check:spatial:live` fetches the public
   route into a mirror (70 files: the HTML, the CSS, the JavaScript, every
   font) and sweeps those bytes with the same instrument and the same
   receipt: **189 measurements, zero findings.**
3. **The falsifier** — `npm run check:spatial:false`: **10 injected page
   defects, 12 broken-baseline cases and 1 case about the instrument itself,
   all caught; 8 of 8 modes.**

**The one thing that did not come out clean.** The gate's `--base` mode
measures a running site through a proxy that re-fetches every asset from the
origin, one round trip at a time: document, stylesheet, script. The
instrument's settle window closes before the application has painted, so
**10 of 189 measurements recorded the page before the app was on it** — a
blank document with no chrome, not a layout defect. The same measurement of
the same bytes, served locally, is clean 189 for 189. That is the harness's
asset chain, not the layout, and it is recorded here rather than hidden:
the fix is to measure the deployed bytes (which is what
`check:spatial:live` does), and the product change that came out of it —
the first render is now flushed synchronously, so the chrome is in the
document before the browser says the page has loaded — is in `e5c4c72`.

**Evidence.** `docs/images/msh-2026-10-24/` holds the live screens at 390,
1024 and 1440: the sign-in page, the ERP cockpit, the CRM board, ACT, HR and
the dossier.

**Still static.** The published site is the evaluation tier: no account
service, so the workspace lives in this browser and the sign-in panel says
so. The Node service (`npm run product`) is the tier with accounts.


## The rebuild (2026-10-24, "still extremely AI design slopped")

Dr Non's complaint was not a bug: *"many texts on the page that look as though
they could have been in smaller boxes… spaces that were there because it got
expanded… you keep expanding, extending, slapping… a page that is so bad in
terms of real estate design."* The root cause he named was **deciding** rather
than **extending**. And the target he named was a screen: *"a palette design
component screen that allows good color combinations, shades, and lights to
come into the system."*

**The position taken.** The deep shade is not only the voice — it is a
**ground**. A surface that has to be looked at stands on it, and the palette
inverts there. No new token was added (Rams: less, but better): the same
seven roles, used as grounds as well as voices.

### Found

1. **Every module was a grid of stretched cells.** The cockpit was a 2×2 of
   `bg-panel p-5` cells; HR, ACT and the dossier carried the same padded-cell
   pattern; the CRM board ran `min-h-[200px]` columns. A cell that is given a
   height it did not ask for is a box around a sentence — the slop, named.
2. **The band said one thing twice.** The vitals strip carried Cash *and*
   Runway, and the money room carried Runway as its hero: a fact said twice
   on one screen is a fact said nowhere.
3. **The band broke and stranded the state.** One flex row of Cash, Runway and
   the workspace state wrapped at 360–414px and left the state alone on the
   last line — an accident, not a layout.
4. **The ACT hero stood beside a queue it could not fill.** 616px of dead
   space under a 104px field: a box that exists to balance a neighbour.
5. **The kanban columns were hollow.** One stage had no cards; the empty
   column was a hole beside three full ones.
6. **The palette screen did not exist.** The system had seven tokens and no
   screen that showed them, the shades between them, or the pairs they allow.
7. **The design route scrolled sideways** by 136px at 360: a table with a
   `min-w` inside a grid column that was not allowed to shrink.
8. **The HR roster repeated itself.** A "Type" column said "Human" on every
   row of the human roster, and the AI roster was a heading over nothing.
9. **The CRM cards were clickable divs** — a deal could not be opened from
   the keyboard.

### Changed

- `src/components/ui/Axiom.tsx` — the components are the law now: `Figure`
  (a number on the deep shade or on paper), `Stat` (a fact on one line, with
  a tone for the deep ground), `Meter`, `SectionHead`, `Station`, and a
  `DataTable` that is allowed to declare its own minimum width.
- `src/modules/erp/ErpModule.tsx` — the runway is the hero, the balance sheet
  stands under it (its inputs, in its column), the two compositions sit beside
  it, and the cash is not repeated.
- `src/modules/act/ActModule.tsx` — the receivables are a full-width field:
  the number at the left, the composition filling the rest of it. The queue is
  its own block beneath, not a column beside a short field.
- `src/modules/hr/HrModule.tsx` — the people cost is the hero on the deep
  shade with the AI/human split under it; the operators are a roster of
  lines, not a grid of cards; the human table lost its constant column.
- `src/modules/crm/CrmModule.tsx` — the board is four drop zones that share
  a height, a sideways strip on a phone, and a card that is a button.
- `src/modules/dossier/DossierView.tsx` — a document, not a dashboard: a
  letterhead, four facts, prose held to its measure, one composition.
- `src/modules/design/DesignModule.tsx` — **the palette screen**: the six
  neutrals as one continuous scale with the amber standing apart from it, the
  five allowed pairs with their measured contrast, and the components drawn
  in the system itself.
- `src/components/Shell.tsx` — the band is two lines: what the workspace
  holds, and where the workspace lives.
- `src/modules/{intake,mirrors,security}` — the steps of a workflow are
  separated by the 2px rule; the two mirror providers and the five security
  checks are content-sized.

### Verified

`npm run check:spatial` passes: **210 measurements — 10 routes × 21 widths —
zero findings.** `npm run check:spatial:false` passes: **10 injected page
defects, 12 broken-baseline cases and 1 case about the instrument itself, all
caught; 8 of 8 modes.** `npm run check:design` passes, `npm run build` passes.

The receipt was re-issued (`--update`) because the pages moved: the first
action on every surface but ACT moved **up**, and on ACT it moved **down** by
147–254px, because the receivables now stand above the queue. The first
action on ACT is still inside the first screen at every width (498px of 900
at 1440, 594px of 844 at 390).

Three limits were turned on, so the receipt now judges instead of only
recording: **`firstAction: 1200`** (the first thing you can do must be within
1200px of the top), **`chromeTopPct: 14`** (the chrome may not take more than
14% of the first screen), **`allowedSizes: [11, 14, 32]`** (the type ramp is
the house ramp). One exemption is written down: the palette screen's buttons
are specimens, so its first "action" is not an action a reader has to reach.

### Remaining

- The gate measures the built site; the deployed site is measured separately
  (`npm run check:spatial:live`) after the upload.
- Frappe is still unrun locally (Docker down, Python 3.9); the Node account
  service remains the verified tier.
- The ERP page's first *control* is a key-result checkbox at 1132px on a
  phone: the money room is read before it is acted on, and no action was
  invented to move that number.

## The columns that had holes (2026-11-05, "Continue. Audit and deploy, go live when safe.")

The directive was to audit and deploy. The audit found a class of hole the
law's own instrument cannot see, and a palette screen that stated numbers it
had never measured.

### Found

1. **Three pages had a column that stopped short of the row it stood in.**
   ERP 99px, HR 77px, the dossier 83px — measured at 1440 and at 1024.
   Nothing overflowed, nothing clipped, no element was an orphan: the pages
   were legal and still looked like accidents, because a column of content
   with a hole under it is not a layout.
2. **The instrument cannot see that class.** It measures holes between stacked
   siblings, orphans, scattered actions, accidental wraps, clipped rows and
   chrome. A grid whose columns are of unequal height is none of those, so
   the gate passed a page that had a hole in it. A hole the gate cannot see
   is a hole the gate cannot protect.
3. **A legend of a composition stranded its own numbers.** The meter legend
   was a row that wrapped; where it broke, one pair was left alone on the
   last line, and the number in a pair sat at the far edge of its column
   instead of beside the word that names it.
4. **The palette screen asserted contrast it had not measured** — 15.4:1
   where the arithmetic gives 16.4:1, and 8.6:1 where it gives 8.3:1 — and
   stated the rule of the system in words it never checked.
5. **The target was half met.** The screen showed the neutrals and the
   allowed pairs, but the system had no stated way for a **shade** or a
   **light** to enter it. "All those things are part of it" was not yet true.

### Changed

- `src/lib/color.ts` — **new**: the arithmetic. A shade is a mix toward ink,
  a light is a mix toward paper; luminance, contrast ratio, and what a
  measured ratio earns a tone the right to do (body / number or rule / fill /
  nothing). It computes; it decides nothing.
- `src/modules/design/DesignModule.tsx` — **the shades and lights section**:
  the rule by which the palette grows (value moves, hue does not; a new hue
  needs the accent slot, and there is one), and six tones that rule admits —
  each drawn in itself, with its recipe, its hex, its measured contrast on
  paper and on the deep shade, and what that measurement earns it. The
  allowed pairs now carry the ratios the arithmetic actually gives.
- `src/components/ui/Axiom.tsx` — `Figure` gained the three slots a hero
  needs (the evidence beside the voice, the facts under a rule, the one
  sentence that asks the reader to act) and centres its two columns against
  each other, so neither is a hole beside the other. `Meter`'s legend is now
  a **grid of pairs** whose column count follows the width of the block
  (container queries), not the width of the screen: the colour, the word and
  the number travel together, and the legend can never leave one pair alone.
- `src/modules/erp/ErpModule.tsx` — the runway is a full-width field: the
  voice at the left, the burn composition and the two facts it is made of
  beside it, and the curve under a rule when there is a run to draw. The
  revenue composition is its own block beneath.
- `src/modules/hr/HrModule.tsx` — the people cost is a full-width field too:
  the split bar, the share at each end, and the two facts that name the
  split, all inside it.
- `src/modules/dossier/DossierView.tsx` — a document: the verdict on the
  measure (amber edge), four facts, the reading matter at its measure beside
  the two compositions and the people counts, and the print action on the
  letterhead — because a reader on a phone was 1365px from the only thing
  they could do.
- `src/modules/act/ActModule.tsx` — the hero's legend is a `Meter` now, so
  the deep shade inverts in one place instead of three.
- `scripts/spatial/balance.mjs` — **new, the balance gate**. For every
  multi-column grid on every route at four widths: how much of the row a
  column leaves empty. A column of boxes is not a hole (a box that ends is a
  box); a column of bare content that stops short of its row IS a hole, and
  a void split above and below (a centred column) is balance, not a hole.
  A dead column may be kept only with a written reason.
- `scripts/spatial/breakpoints.mjs` — **new**: the cliff derivation, shared
  by the built mirror and the deployed one. It states **viewport** cliffs
  only: a container query is the width of a block, not of the screen, and a
  sheet that claims the screen changes at 570px because a legend changes its
  columns there is lying to the instrument.
- `scripts/spatial/evidence.mjs` — **new**: the evidence capture, from the
  deployed bytes by default, at 390, 1024 and 1440.
- `design/balance-exemptions.json` — the exemption ledger. **Empty**: every
  dead column was fixed rather than explained away.

### Verified

- `npm run check:balance` — **40 page loads (10 routes × 4 widths), 0 dead
  columns.** The gate was proven to bite first: a 160px spacer planted in
  the People hero was caught as a 78px hole in three widths, and the ERP's
  own 60px imbalance at 768 was found by the gate, not by eye.
- `npm run check:spatial` — **210 measurements (10 routes × 21 widths), 0
  findings.** The receipt was re-issued (`--update`) because the pages moved,
  and the re-issue reported every decision with a reason.
- `npm run check:design` — pass. `npm run check:instrument` — the four
  instrument files are byte-identical. `npm test` — 27 pass (5 of them new:
  the colour arithmetic is measured, not asserted). `npm run test:server` —
  23 pass. `npx tsc -b` — clean.
- The design screen's numbers are now the arithmetic's: the reading pair is
  16.4:1, the point on the deep shade is 8.3:1, and a tone's admission is
  read off its measured ratio.

### Remaining

- The instrument's chrome reading is occasionally zero on a page that has
  chrome: four of 210 measurements disagreed between the run that wrote the
  receipt and the run that checked it. The instrument is byte-identical and
  cannot be edited, so the defence is the receipt itself — the baseline is
  written and then checked, and a disagreement fails the build.
- Frappe is still unrun locally (Docker down, Python 3.9); the Node account
  service remains the verified tier.
- The ERP page's first *control* is a key-result checkbox: the money room is
  read before it is acted on, and no action was invented to move that number.

## The receipt that measured nothing (2026-11-21, the gate that flaked)

The receipt was re-issued twice and the check disagreed with it on six of two
hundred and ten measurements — half of them reading **111px of chrome in one
run and 0px in the next**, on pages that carry a header every time. The
baseline's own history said it: `hr@1537` was recorded at 0px while
`act@641` was recorded at 111px, and neither page is 0px wide.

### Found

1. **The instrument could measure a page before the app painted.** The
   document reaches "interactive" when it has parsed; a single-page app
   paints after its JavaScript arrives. The instrument reads the page once
   the DOM has been still for a beat, and a page that has not painted yet is
   still, quiet, and empty — indistinguishable from a finished page. It
   recorded 0px of chrome, no text, and no heading for a page that has all
   three.
2. **The receipt could agree with itself and still be a lie.** A void
   measurement written into the baseline is compared against the next run's
   void measurement, and 0px == 0px passes. The gate could have certified an
   empty site.
3. **The product was late to paint, and the machine was crowded.** Measured
   with an instrumented copy of the build: the app's DOM arrived **40–164ms
   after** the document said "interactive", while the instrument's read
   window closed about 140ms after it. The margin was a coin toss. The
   machine's load average was **251** at the worst moment — other agents'
   browsers — and every measurement on this page is a wall-clock one.

### Changed

- **`index.html` + `vite.config.ts`** — the document order is now part of the
  product: the **stylesheet first** (a script is blocked by the style sheets
  that precede it, so the app cannot paint before its styles arrive), and the
  **entry script after `#root`, and asynchronous** (an async module runs the
  moment its bytes arrive, and can mount while the parser is still working).
  A small Vite plugin pins that order, because the build hoists module
  scripts into `<head>` on its own and would have undone both.
- **`src/main.tsx`** — the mount waits for `#root` if the script beat the
  parser, and the first frame is still flushed synchronously.
- **`scripts/spatial/void.mjs`** — **new**: what makes a measurement void.
  A page measured with no text at all was not there yet.
- **`scripts/spatial/check-spatial.mjs`** — **new**: the gate, run so that it
  measures pages. Every sweep is checked for void measurements, and a sweep
  that contains one is **not a verdict**: it is run again. The instrument is
  byte-identical and its own verdict stands on the sweep that measured every
  page as a page.
- **`scripts/spatial/void-falsify.mjs`** — **new**: the proof that the proof
  bites. A build with the painting script removed must be refused, and a
  real page must still be certified.
- **`tests/spatial-void.test.ts`** — **new**: seven tests, so the detector's
  two promises (a rendered page is never void, an unrendered page always is)
  are pinned rather than asserted.

### Verified

- **The product fix, measured**: the app's DOM now arrives **2–27ms after**
  "interactive" (it was 40–164ms), over 14 consecutive loads.
- **`npm run check:spatial:receipt`** — the receipt was issued through the
  wrapper: sweep 1 measured 3 pages before they rendered and was refused,
  sweep 2 measured 1 and was refused, sweep 3 measured every page as a page
  and the instrument's verdict stood. **210 measurements, 0 findings.**
- **`npm run check:spatial`** — the check against that receipt: **210
  measurements, 0 findings, 0 disagreements.** The receipt and its check
  agree, which is the property the flake had broken.

### Remaining

- The gate can still be *slow* to certify: a sweep that catches an
  unrendered page is run again (up to three times). On a loaded machine that
  is minutes, not seconds.
- The void detector keys on the page's own content. A page that renders
  **nothing** would be judged void, and this product has no such page — but
  a future one that is meant to be empty would need an exemption.
- Frappe is still unrun locally (Docker down, Python 3.9); the Node account
  service remains the verified tier.

## The tables that were cut in half (2026-11-21, the census)

The law's gates were green and the phone was not. A census of every region
on every route at 390, 768, 1024 and 1440 — every region that scrolls
sideways and cuts its own content — found **six**, and five of them were
tables.

### Found

1. **Every data table in the product was cut off on a phone.** The ERP's
   loans, the ACT's invoices and expenses, the HR's people, the dossier's
   projects: each one cut **120px** of itself, and the cut fell through the
   middle of a number. Five tables, on five pages, on the device people
   actually hold.
2. **The instrument cannot see this class.** A region the reader scrolls is
   legal to the law's instrument — the page does not scroll sideways, so
   there is no overflow, and nothing is clipped by its own definition. The
   reader sees a chopped column and a number split down the middle, and the
   gate says the page is clean.
3. **A control that cannot fit its own label is the same defect.** The
   instrument's clip rule needs `overflow: hidden`; a button has
   `overflow: visible`, so its label spills out and the neighbour paints
   over it. (Measured here and found whole, for the record: the Thai on the
   language switch renders as ไทย, not cut.)

### Changed

- **`src/components/ui/Axiom.tsx`** — `DataTable` is now a table on a desk
  and a **list of records on a phone**: below 640px the head is hidden from
  sight (kept for the reader of the page), every cell names the column it
  came from, and a record reads as a record. `stack={false}` keeps a table
  a table, for the one screen that shows a table as a specimen.
- **`src/index.css`** — the rules that do it, below 640px.
- **Six tables** — the ERP's loans, the ACT's invoices and expenses, the
  HR's people, the dossier's projects and the onboarding's capital — each
  cell now carries the name of its column.
- **`scripts/spatial/clip.mjs`** — **new, the clip gate**: for every route
  at every width, does every control's own label fit inside the control, and
  does any region cut its own content. It is the project's instrument; the
  law's stays byte-identical.
- **`scripts/spatial/clip-falsify.mjs`** — **new**: the proof that it bites.
  A page with a control that cannot fit its own label must be refused, and a
  real page must still be certified.
- **`design/clip-exemptions.json`** — one entry, with its reason: the CRM
  pipeline is a **board**, and a board is wider than a phone and is scrolled
  along. A board is not a table.

### Verified

- **The census, after the fix**: six cut regions → **one**, the board, with
  its reason written down. No table is cut anywhere.
- **`npm run check:clip`** — 40 page loads (10 routes × 4 widths), every
  control's label fits its own box, one exemption (the board).
- **`npm run check:clip:false`** — the gate refuses a planted defect and
  certifies a real page.

### Remaining

- The board still scrolls sideways on a phone. That is a board's nature and
  it is written down, not hidden.
- A record on a phone is five lines where a row was one. That is the trade:
  nothing is cut, and the page is longer.

## Deployment receipt (2026-11-21, the tables and the first frame)

| | |
|---|---|
| Commit | `bb9f01f` — *fix: the facts under a composition flung their numbers to the far edge* |
| Live | https://each.nonarkara.org — serving `assets/index-C5fZ221x.js` (read three times, the same each time) |
| Deployment | https://dfbb41d9.each-c3p.pages.dev (Cloudflare Pages, project `each`, branch `main`) |
| Built from | an isolated worktree at `bb9f01f` — the bytes published are the bytes measured |

**Measured on the deployed bytes, not on a local build that resembles them:**

- `npm run check:spatial:live` — 210 measurements (10 routes × 21 widths), 0
  findings; the receipt and the live site agree.
- `npm run check:balance:live` — 40 page loads, 0 dead columns.
- `npm run check:clip:live` — 40 page loads, every control's label fits its
  own box, one exemption (the CRM board, with its reason).
- `node scripts/spatial/evidence.mjs` — **30 frames** of the live site at
  390, 1024 and 1440, in `docs/images/msh-2026-11-21-live/`.

**Locally, on the same commit:** `check:design` pass · `check:instrument`
(4 files byte-identical) · `npm test` 34 pass · `npm run test:server` 23
pass · `npx tsc -b` clean · `check:spatial` 210 measurements, 0 findings ·
`check:balance` 40 loads, 0 dead columns · `check:clip` 40 loads ·
`check:void` pass · `check:clip:false` pass · `check:spatial:false` —
10 injected defects, 12 broken-baseline cases and 1 instrument case, all
caught, 8 of 8 modes.

**Still open:** Frappe is unrun locally (Docker down, Python 3.9) — the Node
account service is the verified tier. The ERP page's first *control* is a
key-result checkbox: the money room is read before it is acted on, and no
action was invented to move that number.

### The facts that flew to the far edge (2026-11-21, one more)

The last thing the screenshots showed: in the ERP hero and the People hero,
the two facts under the composition flung their numbers to the far edge of
their own half — "Called capital" and its number four hundred pixels apart,
in a field whose legend two rows above keeps its colour, word and number
together. The same field, two rules.

They are **pairs** now (`src/components/ui/Axiom.tsx`, `Pair`): the word and
the number travel together, and the void between the two pairs is centred —
which is balance, not a hole. The dossier's four facts keep their ledger
line, because that strip is four independent facts about a company and not a
legend of a composition.
