# AXIOM — the startup superapp

CRM + ERP + HR + Accounting for the startup, on the AXIOM DNA. One spine, four pillars.

Live at **https://each.nonarkara.org**

This version runs in the browser, persists to a **Cloudflare D1** database via **Cloudflare Pages Functions**, and falls back to browser `localStorage` when offline or opened locally.

## Quick start

```bash
cd /Users/nonarkara/Projects/CRM2
npm install
npm run dev          # local dev server with D1 bindings
```

Open `http://localhost:8788`.

Try this on the first screen: registration number **`0105566000000`** → the AI fills the company. Scan the paperwork → founding capital lands. Connect Gmail → receipts become expenses.

## Architecture

```
┌─────────────────────────────────────┐
│  AXIOM frontend (vanilla JS + CSS)  │  <- Cloudflare Pages + each.nonarkara.org
└──────────────┬──────────────────────┘
               │ fetch /api/state
┌──────────────▼──────────────────────┐
│  Cloudflare Pages Functions         │  <- /api/state, /api/sync-accounting
└──────────────┬──────────────────────┘
               │ D1 binding
┌──────────────▼──────────────────────┐
│  Cloudflare D1 (SQLite)             │  <- workspace_state table
└─────────────────────────────────────┘
```

For a human-friendly guide, see [`MANUAL.md`](./MANUAL.md).

## The four pillars

- **Onboarding.** Register → AI autofill from public records → scan registration paperwork (Tax ID + paid-in capital) → connect Gmail → expenses flow in. Done.
- **Finances (ERP).** Cash, monthly burn, runway (the oversized figure — the Divine Move), CapEx vs OpEx split, runway projection chart, seed-stage benchmarks, OKR (not KPI), and a transparent ledger.
- **People (HR).** AI operators and human staff, both framed as employees with monthly cost. Both feed OpEx directly into Finances.
- **Projects (CRM).** Kanban with drag-and-drop, checklists, file logs, notes, and AI reads.
- **Accounting.** Chart of accounts, double-entry journal, balance sheet, and profit & loss. One click syncs capital, expenses, and project revenue into the journal.
- **Investor dossier.** Editorial-mode one-pager. One click prints.

## Deploy to production

Prerequisites: Node.js, a Cloudflare account, and `nonarkara.org` configured in Cloudflare.

```bash
# 1. Login (one-time)
npx wrangler login

# 2. Create the D1 database (already done for axiom-db; skip if reusing)
npx wrangler d1 create axiom-db

# 3. Apply migrations
npm run db:migrate

# 4. Optional: set an API key secret if you want token-level protection.
#    If you use Cloudflare Access on the domain, you can skip this.
npx wrangler pages secret put API_KEY

# 5. Deploy
npm run deploy
```

After deploy, open the Cloudflare dashboard → Workers & Pages → `each` → Custom domains → add `each.nonarkara.org`.

## Environment & secrets

| Secret / Var | Purpose |
|---|---|
| `API_KEY` | Optional bearer token for `/api/*`. The frontend will prompt for it if the server returns 401. |

Do not commit secrets. They are managed by Wrangler and Cloudflare.

## Files

```
index.html              shell, fonts, script load order
css/axiom.css           the AXIOM design system (tokens → components)
js/data.js              persistence + seed + simulated registry/Gmail
js/ui.js                tiny DOM + component helpers
js/sync.js              cloud sync indicator + remote state load/save
js/onboarding.js        register → AI autofill → scan → Gmail
js/erp.js               Finances pillar + the calc engine
js/hr.js                People pillar
js/crm.js               Projects pillar
js/accounting.js        Accounting pillar
js/app.js               cockpit, routing, investor dossier, export/import
js/api.js               in-browser CRUD shim (used by pillar modules)
functions/api/state.js  GET/POST workspace state
functions/api/sync-accounting.js  server-side accounting sync
functions/lib/accounting-sync.js  shared accounting logic for backend
migrations/0001_init.sql          D1 schema
wrangler.toml           Cloudflare Pages + D1 config
package.json            npm scripts + wrangler dependency
MANUAL.md               human user guide
```

## AXIOM DNA compliance

One bold move per surface (the runway hero). Blue enclosed for identity; red bare for signal. Warm paper `#f6f5f2`, square corners, hairline cell grids, weight ceiling 600, tabular figures, labels small/letterspaced/uppercase/grey, the red pulse for live. No gradients, shadows, glows, rounded corners, or emoji.

## Roadmap

- **Phase 0 — done.** Prototype. AXIOM DNA applied. Four pillars working.
- **Phase 1 — done.** Cloudflare Pages + D1 backend, custom domain, human manual.
- **Phase 2.** Real AI company lookup, Gmail OAuth, document OCR.
- **Phase 3.** Multi-workspace, user accounts, payroll, invoicing, tax export.

> Beauty is what remains after everything that does not work is gone.
