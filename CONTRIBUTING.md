# Contributing to EACH

EACH puts cash, accounting, customer work and people in one workspace. Changes
should make an actual founder task easier and keep the existing modules working.

Read `AGENTS.md` before editing. Preserve the module navigation, calculations,
kanban, roster and onboarding. Use Josefin Sans, Source Sans 3, IBM Plex Sans Thai
for Thai, and JetBrains Mono for data. Amber is the only accent; corners are
square. Use 32px display, 14px body and 11px metadata text. Controls are at least
44px high. Add Thai and English copy together.

```bash
npm ci
npm test
npm run lint
npm run build
python3 -m unittest discover -s backend/each_backend/tests -v
npm run dev
```

Use synthetic data in fixtures and screenshots. Validate external records before
persistence. A proposed import stays outside the store until approval; a failed
approval must not write part of a document. A spreadsheet save is successful only
when the remote values can be read back and verified.

Keep UI access through `src/lib/store.ts`; Frappe remains the backend choice.
Add tests for money calculations, data boundaries and any change that can lose
records. Exercise the phone view and both languages in a browser before shipping.

Describe the user-visible problem, final behavior, verification and limitations
in your pull request. Use `feat:`, `fix:`, `remove:` or `breaking:` commit subjects.
Do not hide destructive changes behind a cleanup label. Report security problems
privately as described in `SECURITY.md`.
