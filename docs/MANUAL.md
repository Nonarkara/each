# EACH — Human Manual

**Every piece of your startup, unified.** This guide gets a founder from zero to understanding cash, burn, and runway in about fifteen minutes. The web app is the cockpit. **Google Sheets is the engine room** — connected tabs you can read, edit, and share without touching code.

Full tab reference: [`docs/sheets/tab-schema.json`](./sheets/tab-schema.json)

---

## What EACH is (30 seconds)

EACH = **E**RP + **A**CT + **C**RM + **H**R. One workspace for a small startup:

- **Cash and runway** — how many months you can keep building
- **Expenses and loans** — every block that leaves your hand
- **People costs** — humans and AI operators on payroll
- **Deals and projects** — pipeline that becomes revenue

Think of it as a LEGO workshop. **Projects** are models you build. **Expenses** are blocks you buy. **Income** is blocks that come back when someone buys a finished model. **Cash** is blocks in your hand right now. The game ends when you run out of blocks. EACH tracks every block so you always know whether you can keep building.

---

## Quick start — 15 minutes (Sheets-first)

### Step 1 · Open the app (2 min)

1. Go to **https://each.nonarkara.org** (or run locally: `npm install && npm run dev`).
2. Choose **Load demo** to explore a pre-filled Thai AI startup, or **Start blank** for your own company.
3. Complete onboarding: company name → registry lookup (or manual entry) → founding capital → skip or connect Gmail.

Your numbers appear in the header: **Cash** and **Runway**.

### Step 2 · Create your Google Sheet (5 min)

1. Open **Google Sheets** → **Blank spreadsheet**.
2. Name it `EACH — [Your Company]`.
3. **Extensions → Apps Script**.
4. Delete the default code. Paste everything from **`sheets/apps-script.gs`** in this repo.
5. **Save** (disk icon). Run **`setupWorkbook`** once (Run menu → select `setupWorkbook` → Run). Authorize when prompted.
6. **Deploy → New deployment → Web app**:
   - Execute as: **Me**
   - Who has access: **Anyone**
7. Copy the **Web App URL**.

### Step 3 · Connect the app (1 min)

1. In EACH, click **Sheet URL** in the top bar.
2. Paste the Web App URL. Confirm.
3. The status dot turns amber when synced: **Synced to Sheet**.

From now on, every change in the app pushes to your Sheet. Edits you make in the Sheet tabs load back when you refresh (or on next open).

### Step 4 · Or start from CSV (no Apps Script yet)

1. Click **Sheets** in the top bar. EACH downloads nine CSV files (one per tab).
2. In Google Sheets: **File → Import → Upload** each CSV into the matching tab name (`expenses`, `projects`, etc.).
3. When ready for live sync, complete Step 2–3 above.

### Step 5 · Read your finance (5 min)

Open the **Dashboard** tab in your Sheet (created by `setupWorkbook`). Row by row:

| Row | Metric | What it means |
|-----|--------|----------------|
| Cash on hand | B5 | Money in the bank after everything so far |
| Monthly burn | B10 | What leaves each month at current pace |
| Runway (months) | B11 | Months until cash hits zero |

If runway is below 6, the app header turns amber. That is the signal to raise or cut — not to ignore.

---

## The four modules (E · A · C · H)

| Letter | Module | Sheet tabs | What you do there |
|--------|--------|------------|-------------------|
| **E** | ERP | `Dashboard`, `foundingCapital`, `loans`, `objectives` | See runway, record loans, track OKRs |
| **A** | ACT | `expenses`, `actions` | Expense ledger, action queue (invoices to send, follow-ups) |
| **C** | CRM | `projects` | Kanban deals — pipeline vs commissioned, revenue received |
| **H** | HR | `employees`, `aiEmployees` | Human salaries + AI tool costs (both feed monthly burn) |

**Metadata** holds company name, currency, and as-of date. You rarely edit it by hand.

---

## Google Sheets architecture — why it is not scary

Your workbook is not one giant table. It is **tabs that talk to each other**:

```
foundingCapital ──┐
projects.received ──┼──► Dashboard (formulas) ──► Cash, Burn, Runway
expenses ─────────┤
aiEmployees ──────┤
employees ────────┤
loans ────────────┘
```

- **Data tabs** (`expenses`, `projects`, …) — plain rows. Add a row = add a transaction. Same columns as the app.
- **Dashboard tab** — formulas only. Never type numbers here; they recalculate when data tabs change.
- **Apps Script** — a thin bridge. When the app saves, script writes rows to tabs. When the app loads, script reads tabs back into JSON.

You do not need to understand JSON. You need to understand rows and columns — which you already do if you have ever used a spreadsheet.

Column definitions live in [`docs/sheets/tab-schema.json`](./sheets/tab-schema.json).

---

## Apps Script — what runs automatically

| Trigger | What happens |
|---------|----------------|
| App saves data | `doPost` writes all tabs + refreshes Dashboard formulas |
| App loads / refresh | `doGet` reads every tab back into the app |
| You run **Setup workbook** | Creates all tab names + Dashboard formulas |
| EACH menu → **Refresh Dashboard** | Rebuilds formula cells if you accidentally edited them |

**Copy/deploy checklist:**

1. Paste `sheets/apps-script.gs` into Apps Script editor.
2. Run `setupWorkbook` once.
3. Deploy as Web app (Anyone).
4. Paste URL into EACH (**Sheet URL** button or `VITE_SHEETS_WEB_APP_URL` in `.env` for local dev).

The hidden **RawData_Backup** tab stores full JSON — insurance if a tab gets corrupted.

---

## Finance in 5 minutes — the actual math

EACH uses one conservation law everywhere (app, Sheet Dashboard, dossier):

```
Cash = Founding capital + Revenue received − Total expenses
```

In the **Dashboard** tab:

| Cell | Formula | Plain English |
|------|---------|---------------|
| B2 | `=SUM(foundingCapital!D2:D)` | Money shareholders put in |
| B3 | `=SUM(projects!H2:H)` | Cash collected from deals (`received` column) |
| B4 | `=SUM(expenses!F2:F)` | Everything spent so far |
| **B5** | `=B2+B3-B4` | **Cash on hand** |
| B6 | `=SUM(aiEmployees!F2:F)` | Monthly AI subscriptions |
| B7 | `=SUM(employees!D2:D)` | Monthly salaries |
| B8 | `=SUM(loans!F2:F)` | Loan installments per month |
| B9 | `=SUMIFS(...)` | OpEx dated this calendar month only |
| **B10** | `=B6+B7+B8+B9` | **Monthly burn** |
| **B11** | `=IF(B10>0,FLOOR(B5/B10),"")` | **Runway in months** |

**Burn** is not “all expenses ever.” It is what repeats **this month**: people + AI + debt service + this month’s operating receipts.

**Runway** = cash ÷ monthly burn, rounded down. If burn is zero, runway is infinite — but that usually means you have not recorded costs yet, not that you are immortal.

**CapEx vs OpEx:** `expenses.type` = `capex` (durable equipment) or `opex` (fuel). CapEx hits cash once; OpEx in the current month adds to burn.

---

## Daily use (app top bar)

| Button | Action |
|--------|--------|
| **Export** | JSON backup of everything |
| **Sheets** | Download CSV bundle (one file per tab) |
| **Import** | Restore from JSON backup |
| **Sheet URL** | Connect or change Apps Script Web App URL |
| **Dossier** | One-page investor summary → print to PDF |
| **Reset** | Wipe local data (Sheet unchanged unless synced) |

Sync status:

- **Local only** — no Sheet URL configured; data stays in browser
- **Synced to Sheet** — last push succeeded
- **Sheet sync error** — check URL, deployment access (“Anyone”), internet

---

## Adding common records

### Expense (ACT module)

1. Go to **A · ACT** → **+ Add expense**.
2. Vendor, amount, category, type (OpEx or CapEx).
3. Row appears in `expenses` tab on next sync.

### Loan (ERP module)

1. Go to **E · ERP** → **Credit & installments** → **+ Add loan**.
2. Lender, principal, rate, term, monthly installment.
3. Installment adds to burn and reduces runway automatically.

### Person (HR module)

1. Go to **H · HR** → **+ Add operator** (AI) or **+ Add employee** (human).
2. Monthly cost/salary feeds burn via `aiEmployees` or `employees` tab.

### Deal (CRM module)

1. Go to **C · CRM** → **+ New project**.
2. Set **deal status**: `pipeline` (maybe) or `commissioned` (signed).
3. When cash arrives, record **received** — it increases cash the same way founding capital does.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Runway looks wrong | Check `loans.installment`, `aiEmployees.cost`, `employees.salary`, and this month’s `opex` rows |
| Cash does not match bank | Verify `foundingCapital.amount`, `projects.received`, and `expenses.amount` — cash ignores pipeline until received |
| Sheet sync error | Redeploy Web app as **Anyone**; re-paste URL; run **Setup workbook** again |
| Dashboard shows `#REF!` | EACH menu → **Refresh Dashboard formulas** |
| Data gone after refresh | Private/incognito clears browser storage — use **Import** from JSON backup or reload from Sheet |
| Edited Sheet but app unchanged | Refresh the page; app pulls from Sheet on load |
| CSV import column mismatch | Use headers from `docs/sheets/tab-schema.json` exactly |

---

## Technical appendix (optional)

**Web app:** Vite + React 19. Data lives in `localStorage` until you connect Sheets or Phase 2 Frappe.

**Calc engine:** `src/lib/calc.ts` — same formulas as Dashboard tab. Phase 2 swaps the data source, not the math.

**Phase 2 backend:** Frappe ecosystem (ERPNext + Frappe HR + Frappe CRM). See `context.md`.

**Local dev with Sheets:**

```bash
cp .env.example .env
# Set VITE_SHEETS_WEB_APP_URL=https://script.google.com/macros/s/…/exec
npm run dev
```

**Repo paths:**

| Path | Purpose |
|------|---------|
| `docs/MANUAL.md` | This file |
| `docs/sheets/tab-schema.json` | Tab + column spec |
| `sheets/apps-script.gs` | Google Apps Script source |
| `src/services/sheets.ts` | Export, import, sync |

---

One system. Every metric. Zero chaos — and a spreadsheet you can actually open on your phone.
