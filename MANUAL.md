# Each — Human Manual

Each is a simple all-in-one workspace for a small startup: **CRM + ERP + HR + Accounting**. Made by [Axiom](https://axiom.nonarkara.org). It runs in your browser and saves your data to the cloud when you are online.

## How to think about Each

Each turns your startup into a LEGO game:

- **Projects** are the models you want to build.
- **Resources** are the blocks you need.
- **Expenses** are the blocks you buy.
- **Income** is the blocks that come back when someone buys your finished model.
- **Cash** is the blocks currently in your hand.
- **Credit** is borrowing blocks now and paying them back later, usually with interest.

Some blocks are **CapEx** — durable helpers and equipment you reuse for future models. Some blocks are **OpEx** — the daily fuel that keeps the workshop open. The game ends when you run out of blocks to keep building. The goal is to finish models that fund bigger models.

Each tracks every block so you always know whether you can keep building.

## First visit

1. Open `https://each.nonarkara.org`.
2. You will see two choices:
   - **Load demo** — try the app with a pre-filled Thai AI-startup.
   - **Start blank** — enter your own company details step by step.
3. If you start blank:
   - Enter your company name and registration number, then click **Search public records**.
   - If no record is found, fill in the fields manually.
   - Add your founding capital (scan box is simulated; it will read a placeholder value).
   - Connect Gmail is simulated; click **Skip for now** if you do not want to add fake receipts.

Your data is saved automatically when you are online. A small dot in the top bar shows the sync status:

- **Blue dot** = saved to cloud
- **Grey dot** = local only (offline or opened as a file)
- **Red dot** = sync error

## Daily use

### Top bar
- **Cash / Runway** — quick numbers. If runway is below 6 months, the number turns red.
- **Export** — download your full data as a JSON backup.
- **Sheets** — download 4 CSV files ready for Google Sheets.
- **Import** — restore from a JSON backup.
- **Reset** — wipe everything and start over.

### Pillars

| Tab | What to do there |
|---|---|
| **Finances** | See cash, burn, runway, revenue pipeline, and the expense ledger. Add expenses with **+ Add expense**. |
| **People** | Add AI operators and human staff. Their costs feed into monthly burn. |
| **Projects** | Kanban board for deals and work. Drag cards between columns. Click a card to add tasks, notes, and files. |
| **Accounting** | Chart of accounts, journal, balance sheet, and profit & loss. Click **Sync to journal** to turn expenses and project revenue into double-entry bookkeeping. |
| **Dossier** | One-page investor summary. Click **Print dossier** to print or save as PDF. |

## Adding an expense

1. Go to **Finances**.
2. Scroll to **Expense ledger** and click **+ Add expense**.
3. Enter vendor, amount, category, and type (OpEx or CapEx).
4. Click **Record**. Amount must be greater than 0.

## Tracking credit / loans

1. In **Finances**, scroll to **Credit & installments**.
2. Click **+ Add loan**.
3. Enter lender, remaining principal, annual rate, term, and monthly installment.
4. Each includes the monthly installment in your burn and runway automatically.

## Adding a person

1. Go to **People**.
2. Click **+ Add operator** for AI tools, or **+ Add employee** for humans.
3. Name and monthly cost/salary are required. Efficiency is a percentage (0–100).

## Managing projects

1. Go to **Projects**.
2. Click **+ New project** and give it a title.
3. Click a card to open it:
   - Add tasks and tick them off.
   - Upload file names (real file upload is not implemented yet).
   - Log notes.
   - Drag the card between columns.

## Accounting sync

1. Go to **Accounting**.
2. Click **Sync to journal**. Each will create journal entries from:
   - Founding capital
   - Expenses
   - Commissioned projects (received cash and outstanding receivables)
3. Review the **Balance sheet** and **Profit & loss**.
4. You can also add manual journal entries with **+ Manual entry**. Debits must equal credits.

## Backups & Google Sheets

- Click **Export** in the top bar anytime to download a JSON file.
- Click **Sheets** to download four CSV files: finances, people, projects, and journal.
- Open any CSV in Google Sheets with **File → Import → Upload**.
- To restore from a JSON backup, click **Import** and choose the file. This replaces your current data.

## Troubleshooting

| Problem | Fix |
|---|---|
| "Sync error" red dot | Check your internet connection and refresh. If it persists, the API key may be wrong or the server is down. |
| Data disappeared after refresh | You may be in private/incognito mode, or local storage was cleared. Use **Import** to restore from backup. |
| Cannot add an expense / person | Make sure all required fields are filled and numbers are not negative. |
| Accounting numbers look wrong | Go to **Accounting** and click **Sync to journal** again. |

## Important notes

- This is a single-workspace tool. If multiple people edit at the same time, the last save wins.
- Company registry lookup, Gmail import, and document OCR are simulated in this version.
- For real integrations, contact your developer.
