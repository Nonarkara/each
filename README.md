# Each

> **ERP · ACT · CRM · HR for the startup.**  
> One spine. Four pillars. Nothing else.

[![Axiom Github Pick of the Day](./assets/each-badge.svg)](https://axiom.nonarkara.org)

[![Cloudflare Pages](https://img.shields.io/badge/Deployed%20on-Cloudflare%20Pages-F38020?logo=cloudflare&logoColor=white)](https://each.nonarkara.org)
[![Cloudflare D1](https://img.shields.io/badge/Database-Cloudflare%20D1-2D8A4E?logo=cloudflare&logoColor=white)](#architecture)
[![Vanilla JS](https://img.shields.io/badge/Frontend-Vanilla%20JS-191712)](#files)
[![License: MIT](https://img.shields.io/badge/License-MIT-191712)](./LICENSE)

<p align="center">
  <img src="./assets/axiom-spine.svg" alt="Each — one spine, four pillars" width="720"/>
</p>

---

## What is Each

Most business software is a frankenstein of foreign runtimes, bloated modules, and features you will never use. Founders do not need a dashboard for dashboards. They need to know three things: **cash, people, and what is shipping**. Everything else is noise.

**Each** (EACH = ERP, ACT, CRM, HR) strips it down:

- **One spine.** The cockpit, routing, and data layer are shared by every pillar.
- **Four pillars.** Finances, People, Projects, Accounting. No more, no less.
- **One bold move per surface.** Runway is the hero number. The rest is context.
- **No framework fatigue.** Vanilla JS and CSS. No build step in the way of reading the code.

If you are tired of stitching EspoCRM, ERPNext, Frappe HR, and a separate accounting app together, Each is the opposite direction: a single, opinionated workspace that a solo founder can actually run.

---

## Made by Axiom

Each is a product of [Axiom](https://axiom.nonarkara.org) — an innovation consultancy that builds tools for founders and growing teams. Axiom's philosophy: the best tool is the one that disappears into the work.

---

## The four pillars

| Pillar | Discipline | What it gives you |
|---|---|---|
| **Finances** | ERP | Cash, burn, runway, CapEx/OpEx split, revenue pipeline, transparent ledger |
| **People** | HR | AI operators + human staff, both treated as monthly OpEx |
| **Projects** | CRM | Kanban, checklists, notes, deal status, AI reads on outstanding revenue |
| **Accounting** | Books | Chart of accounts, double-entry journal, balance sheet, P&L |

The investor dossier is the fifth surface — not a pillar, but the **export**. One page, one print button.

---

## How it works

```mermaid
sequenceDiagram
    participant F as Founder
    participant E as Each
    participant D as Cloudflare D1

    F->>E: Register company + founding capital
    F->>E: Add expenses, people, projects
    E->>D: Auto-save state (debounced, 1.2 s)
    D->>E: Restore state on next visit
    F->>E: Click "Sheets" → 4 CSV files
    F->>E: Click "Dossier" → investor PDF
```

---

## Architecture

```mermaid
flowchart TB
    subgraph Client
        A[Each Frontend<br/>vanilla JS + CSS]
    end
    subgraph Edge["Cloudflare Edge"]
        B["/api/state"]
        C["/api/sync-accounting"]
    end
    subgraph Database
        D[(Cloudflare D1<br/>SQLite)]
    end

    A <-->|fetch JSON| B
    A -->|POST state| B
    A -->|trigger sync| C
    B <-->|read / write| D
    C <-->|read / write| D
```

- **Frontend:** Cloudflare Pages serves static HTML/CSS/JS. No bundler. No transpiler.
- **Backend:** Cloudflare Pages Functions handle `/api/state` and `/api/sync-accounting`.
- **Database:** Cloudflare D1 stores one `workspace_state` row per company.
- **Offline fallback:** Falls back to `localStorage` when offline or served from `file://`.
- **Security:** Add Cloudflare Access on `each.nonarkara.org` for zero-code auth, or set an `API_KEY` secret for token-level protection.

---

## Data model

```mermaid
graph LR
    S[State] --> FC[Founding Capital]
    S --> EX[Expenses]
    S --> AI[AI Operators]
    S --> HU[Human Staff]
    S --> PR[Projects]
    S --> AC[Chart of Accounts]
    S --> JR[Journal Entries]

    FC -->|feeds| JR
    EX -->|feeds| JR
    PR -->|revenue| JR
    FC & EX & AI & HU --> FIN[Finance Engine]
    FIN -->|cash · burn · runway| cockpit([Cockpit])
```

All state lives in one JSON blob. The finance engine derives every number from first principles on each render — no cached intermediates.

---

## Google Sheets export

Click **Sheets** in the top bar. Four CSV files download instantly:

| File | Contents |
|---|---|
| `{company}-finances.csv` | All expenses: date, vendor, category, CapEx/OpEx, amount |
| `{company}-people.csv` | AI operators + human staff with monthly costs and efficiency |
| `{company}-projects.csv` | All projects: status, deal type, value, tasks progress |
| `{company}-journal.csv` | Full double-entry journal: account, debit, credit, entry type |

Open any CSV in Google Sheets with **File → Import → Upload**. No API key. No OAuth. No setup. Just data.

---

## Quick start

```bash
git clone https://github.com/Nonarkara/each.git
cd each
npm install
npm run dev          # http://localhost:8788
```

No bundler. No transpiler. The dev server is Wrangler with a local D1 binding.

**Demo:** enter registration number **`0105566000000`** on the first screen → Each autofills the company → scan paperwork → founding capital lands → connect Gmail → receipts become expenses.

For day-to-day use, read [`MANUAL.md`](./MANUAL.md).

---

## Deploy your own

You need a Cloudflare account.

```bash
npx wrangler login
npm run db:create         # creates the D1 database
npm run db:migrate        # runs migrations (workspace_state table)
npm run deploy            # first deploy to Cloudflare Pages
```

### Custom domain

```bash
npx wrangler pages domain add each.yourdomain.com --project-name each
```

Cloudflare auto-creates the CNAME record if your domain is already managed by Cloudflare.

### Continuous deployment (GitHub Actions)

A workflow is included at `.github/workflows/deploy.yml`. Deploys on every push to `main`. Add two secrets to your GitHub repo under **Settings → Secrets → Actions**:

```
CLOUDFLARE_API_TOKEN    # Cloudflare → My Profile → API Tokens → Cloudflare Pages:Edit
CLOUDFLARE_ACCOUNT_ID   # Cloudflare dashboard sidebar
```

### Optional API-key layer

```bash
npx wrangler pages secret put API_KEY
```

The frontend prompts for the key on first load if the server returns `401`.

---

## Design discipline

Each follows the **AXIOM DNA** from [Axiom](https://axiom.nonarkara.org):

- One bold move per surface.
- Blue enclosed for identity; red bare for signal.
- Warm paper `#f6f5f2`, square corners, hairline cell grids.
- Weight ceiling 600, tabular figures, small uppercase labels.
- No gradients, shadows, glows, rounded corners, or emoji.

The code follows the same rule: the smallest number of files and concepts that still works.

---

## Files

```
index.html                         shell and script load order
css/axiom.css                      Each design system
js/data.js                         persistence, seed data, simulated integrations
js/ui.js                           DOM helpers (el, modal, station)
js/sync.js                         cloud sync indicator + remote state client
js/api.js                          in-browser CRUD shim used by pillar modules
js/sheets.js                       Google Sheets CSV export (4 files)
js/onboarding.js                   company registration and setup flow
js/erp.js                          Finances pillar
js/hr.js                           People pillar
js/crm.js                          Projects pillar
js/accounting.js                   Accounting pillar
js/app.js                          cockpit, routing, dossier, export/import
functions/api/state.js             GET/POST workspace state
functions/api/sync-accounting.js   server-side accounting sync trigger
functions/lib/accounting-sync.js   shared double-entry sync logic
migrations/0001_init.sql           D1 schema
wrangler.toml                      Cloudflare config
package.json                       scripts and wrangler dependency
assets/axiom-spine.svg             spine diagram
assets/each-badge.svg              Axiom Github Pick of the Day badge
MANUAL.md                          human user guide
LICENSE                            MIT
```

---

## Roadmap

- [x] Four working pillars (Finances, People, Projects, Accounting)
- [x] Cloudflare Pages + D1 backend with offline fallback
- [x] Custom domain + continuous deploy pipeline
- [x] Investor dossier (print-ready one-pager)
- [x] Google Sheets CSV export (4 files)
- [ ] Real company registry API lookup
- [ ] Real Gmail OAuth + receipt ingestion
- [ ] Document OCR for registration paperwork
- [ ] Multi-workspace + user accounts
- [ ] Payroll, invoicing, tax export

---

## License

[MIT](./LICENSE) · Made with discipline by [Axiom](https://axiom.nonarkara.org)

> Beauty is what remains after everything that does not work is gone.
