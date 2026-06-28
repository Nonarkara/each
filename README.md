# EACH — Dr Non's No-Brainer Complete Startup/SME Management Tool

**Every piece of your startup, unified.**

> One system. Every metric. Zero chaos.

EACH rearranges four functions every founder juggles — **ERP**, **ACT**, **CRM**, and **HR** — into one word that is easy to spell, easy to pitch, and impossible to forget. No four logins. No tab chaos. One spine.

## The four modules

| Letter | Module | What it covers |
|--------|--------|----------------|
| **E** | **ERP** | Finance, inventory, operations — cash, burn, runway, CapEx vs OpEx |
| **A** | **ACT** | Accounting & actions — invoices, ledger, tax exports, the action queue |
| **C** | **CRM** | Customers, pipeline, deals — kanban, stages, touchpoints |
| **H** | **HR** | People, payroll, leave — humans + AI operators feeding OpEx |

## Why EACH works

Founders do not need another acronym deck. They need one surface where the runway number, the invoice queue, the deal pipeline, and the payroll line all reconcile. EACH is sticky naming: it is a product word, not a category label.

The architecture inherits honest lessons from the CRM2 / AXIOM prototype:

```
EACH DNA frontend   (look, flow, discipline — Josefin Sans + Source Sans 3, amber accent)
        ↓  REST / WebSocket
Frappe backend      (ERPNext + Frappe HR + Frappe CRM — phase 2)
```

**Frappe Books is a desktop app**, not a Frappe-framework app — it does not share the ERPNext backend. The clean integration play is the **Frappe ecosystem**: one framework, one auth, one data model.

## Run locally

```bash
cd /Users/nonarkara/Projects/each
npm install
npm run dev
```

Open the URL Vite prints (default `http://localhost:5173`).

## Human manual

**Start here:** [`docs/MANUAL.md`](docs/MANUAL.md) — 15-minute Sheets-first setup, finance formulas, troubleshooting.

Google Sheets template: [`sheets/apps-script.gs`](sheets/apps-script.gs) + tab schema [`docs/sheets/tab-schema.json`](docs/sheets/tab-schema.json).

## Roadmap

| Phase | Scope |
|-------|--------|
| **0 — now** | Repo scaffold, landing, app shell, four-module routing, localStorage shim |
| **0.5** | Port CRM2 prototype logic (onboarding, ERP calc, HR roster, CRM kanban) into React modules |
| **1** | Real AI company lookup, Gmail OAuth, OCR on registration paperwork |
| **2** | Frappe backend — swap data shim for ERPNext + Frappe HR + Frappe CRM REST |
| **3** | Multi-tenant auth, real charts, payroll, invoicing, tax export |

## Stack

- **Vite** + **React 19** + **TypeScript** (strict)
- **Tailwind CSS v4** with Dr Non design tokens
- **Typography:** Josefin Sans (display) · Source Sans 3 (body) · JetBrains Mono (data)
- **Persistence (phase 0):** `localStorage` shim in `src/lib/store.ts`
- **Deployment target:** GitHub Pages (static) or Render when API routes land

## Project layout

```
src/
  components/     Shell, Hero, module cards
  lib/            types, store shim
  modules/        erp/, act/, crm/, hr/ (phase 0.5)
context.md        live metadata
CLAUDE.md         build rules + anti-regression
tasks/            todo + lessons
```

## Lineage

EACH supersedes the CRM2 workspace prototype (`/Users/nonarkara/Projects/CRM2`), which shipped as **AXIOM** with three pillars (Finances, People, Projects). EACH adds **ACT** as a first-class module and rebrands the product for founders who need one word, not one framework lecture.

---

Beauty is what remains after everything that does not work is gone.
