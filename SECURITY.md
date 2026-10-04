# Security policy

EACH is currently a development/pilot system. The public static app is an
evaluation workspace. It is not a hosted multi-tenant ERP service.

Browser records are stored in plaintext localStorage. A Frappe backend adds
server-authorized persistence, but does not encrypt that offline browser cache.
Provider API keys entered in document intake stay in memory and are sent only
to the selected endpoint when the user requests analysis. Administrator/provider
secrets belong in server environment variables, never in `VITE_*` or Git.

Document text and spreadsheet rows are untrusted input. AI proposals require
human approval and source evidence before filing. This reduces accidental
writes; it does not guarantee AI accuracy or replace an accounting review.

Report a vulnerability through this repository's private GitHub vulnerability
reporting feature if enabled. If unavailable, contact the repository owner
privately through the contact route on [nonarkara.org](https://nonarkara.org).
Do not put keys, payroll, tax IDs, customer documents or exploit details into a
public issue. Include affected version, reproduction with synthetic data,
expected behavior and observed impact. Rotate any exposed credentials promptly.

Before putting a startup on an internet-facing deployment, verify server
sessions/CSRF, user/role isolation, TLS, backups and restores, provider access,
retention, offline-cache policy and incident ownership. The laptop Docker
profile's development passwords must not be exposed to the internet.

## Security Center and encrypted recovery

The app includes evidence-based checks, incident-response guidance, bounded device
activity, and authenticated `.eachlock` backups with reviewed restores. Technical
parameters, adapted patterns and limits are in [PRIOR_ART.md](docs/PRIOR_ART.md).
AES-GCM backup encryption does not encrypt localStorage or remove copies from
spreadsheets. No network intrusion detection or compliance certification is implied.

Push/PR checks include Gitleaks and CodeQL; npm audit for high/critical findings also
gates the deployment build. Dependabot proposes updates without auto-merging them.
Do not run active vulnerability scans against production as part of this workflow.
