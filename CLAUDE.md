# EACH — agent rules

## What this project is

EACH = ERP + ACT + CRM + HR. A unified startup/SME management tool. Phase 0 is a Vite/React scaffold with localStorage. Phase 2 targets Frappe backend.

## Build commands

```bash
npm run dev
npm run build
npm run preview
```

## Anti-regression — do not touch without approval

1. **Never collapse a file by more than 30%** in one edit.
2. **Never delete interactive surfaces** — module nav, cockpit vitals, onboarding flow (when ported), kanban (when ported).
3. **Never introduce rounded corners, gradients, drop shadows, or a second accent colour.** One amber (`#f59e0b`). `border-radius: 0` site-wide.
4. **Never use banned template fonts:** Roboto, Inter, Poppins, Montserrat, Open Sans, Lato as primary UI fonts. Use Josefin Sans + Source Sans 3.
5. **Never replace earned CRM2 logic with placeholder cards** when porting — port the real calc/kanban/roster, do not stub forever.
6. **Never commit `.env` or secrets.**

## Design rules (project-specific)

- **Mobile-first** — base styles for ≤480px; scale up with `@media (min-width: …)`.
- **Three text sizes per page:** display 32px, body 14px, micro 11px.
- **Tap targets ≥ 44×44px.**
- **Hairline grids:** `gap: 1px; background: var(--color-line)` with white/panel cells.
- **One bold move per surface** — runway hero in ERP, not four competing heroes.

## Architecture rules

- `src/lib/store.ts` is the **data shim**. Phase 2 swaps it for Frappe REST without changing UI components.
- Module code lives in `src/modules/{erp,act,crm,hr}/`.
- ACT is first-class — do not fold accounting-only features back into ERP.

## Backend decision (locked)

Frappe ecosystem: ERPNext + Frappe HR + Frappe CRM. Not EspoCRM. Not Frappe Books as backend.

## Porting from CRM2

Source: `/Users/nonarkara/Projects/CRM2/js/`

| CRM2 file | EACH target |
|-----------|-------------|
| `data.js` | `src/lib/store.ts` + API shim |
| `onboarding.js` | `src/modules/onboarding/` |
| `erp.js` | `src/modules/erp/` |
| `hr.js` | `src/modules/hr/` |
| `crm.js` | `src/modules/crm/` |
| `app.js` | `src/components/Shell.tsx` + routing |
| `css/axiom.css` | `src/index.css` + Tailwind tokens (rebrand amber, drop blue/red dual accent) |

## Commit subjects

Use `feat:`, `fix:`, `remove:`, `breaking:` prefixes. Destructive diffs must not hide behind `refactor:` or `cleanup:`.
