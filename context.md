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
| Display font | Josefin Sans |
| Body font | Source Sans 3 |
| Mono font | JetBrains Mono |
| Accent | `#f59e0b` (amber — one accent only) |
| Paper | `#f6f5f2` |
| Ink | `#191712` |
| Corners | `0` — no border-radius except true circles |
| Layout | Mobile-first, 44px tap targets, hairline grids |

## Architecture

```
Offline:   Vite/React + localStorage cache (storeApi in src/lib/store.ts)
Local:     Frappe v15 + MariaDB persistence via src/services/frappeSync.ts
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
