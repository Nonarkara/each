# EACH — tasks

## Phase 0 scaffold (2026-06-27)

- [x] Create repo at `/Users/nonarkara/Projects/each`
- [x] Vite + React + TypeScript + Tailwind v4
- [x] README, context.md, CLAUDE.md
- [x] Landing page + app shell with four-module routing
- [x] localStorage store shim

## Phase 0.5 port (2026-06-27)

- [x] Port CRM2 store + calc engine
- [x] Port CRM2 onboarding flow (register → autofill → scan → Gmail)
- [x] Port CRM2 ERP calc + finances UI
- [x] Port CRM2 HR roster + AI operators
- [x] Port CRM2 CRM kanban
- [x] Add ACT module UI (invoices, ledger, action queue)
- [x] Investor dossier export
- [x] Phase 1 service stubs (company lookup, Gmail, OCR)
- [x] Phase 2 Frappe swap point documented

## Deploy (2026-06-27)

- [x] GitHub repo + initial push
- [x] GitHub Pages deploy workflow
- [x] CNAME each.nonarkara.org
- [x] Verify GitHub Actions deploy green (workflow_dispatch run 28289870430)

## Review

**Shipped 2026-06-27:** Full CRM2 logic ported to React with EACH branding (amber, Josefin Sans + Source Sans 3). ACT module split from ERP. Onboarding + demo dataset. GitHub Pages + custom domain scaffold.

## Phase 1 local open-source backend (2026-07-19)

- [x] Add clone-and-run Docker Compose stack
- [x] Add Frappe v15 + ERPNext bootstrap; keep Frappe HR/CRM for native mapping phase
- [x] Add MariaDB and Redis persistent volumes
- [x] Add authenticated EACH workspace persistence app
- [x] Sync through `src/lib/store.ts` with localStorage offline fallback
- [x] Document first run, backup, reset, and security boundary
- [ ] Map JSON workspace fields to native ecosystem DocTypes
- [ ] Add hardened production Compose/image workflow

## Reviewed startup intake and mirrors (2026-10-05)

- [x] Palette-informed TH/EN intake, mobile navigation, and didactic module guidance
- [x] PDF text and optional local TH/EN OCR; local/API model proposals with source evidence
- [x] Explicit edited/selected approval, duplicate protection, and Hippocampus source trail
- [x] Real XLSX two-way file mirror with replacement diff and stale-review protection
- [x] Authenticated server-side Google Sheets / Microsoft Graph mirror connectors
- [x] Manual Apps Script transfer with revision checks and read-back verification
- [x] Professional setup, contribution, and security documentation
- [x] 16 TypeScript tests, 9 Python tests, lint, build, and EACH design contract
- [ ] Verify cloud connectors with configured real provider accounts
- [ ] Human Thai language review and shared production tenancy hardening

Shared generic Axiom audit reports display-weight and educational-arrow rules that differ
from this project's explicit contract. `npm run check:design` enforces EACH's source rules;
browser checks verify the rendered Thai type and mobile layout. Optional PDF/XLSX chunks
are lazy-loaded and trigger Vite's size advisory.
