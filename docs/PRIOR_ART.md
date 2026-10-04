# Public patterns adapted into EACH

SIC here means study, improve and combine. Public documentation informs behavior;
EACH keeps its own implementation, amber identity, Thai/English guidance and
four-module architecture. No third-party source code or private data was copied.

| Source | Pattern | EACH implementation | Deliberately omitted |
|---|---|---|---|
| [Twenty navigation](https://docs.twenty.com/user-guide/layout/capabilities/navigation) | Find the tool without memorizing menus | Thai/English quick navigation, Cmd/Ctrl+K, keyboard Enter and native modal focus containment | Vendor styling and unrelated customization |
| [Paperless-ngx usage](https://docs.paperless-ngx.com/usage/) | Search document metadata and treat ingestion as a reviewable workflow | Hippocampus search across filenames, summaries and approved source evidence | Automatic approval, original-file cloud storage |
| [Wazuh configuration assessment](https://documentation.wazuh.com/current/user-manual/capabilities/sec-config-assessment/index.html) | Show a check, its evidence and remediation | Security Center with observed, backend-verified and unchecked states | Agent installation, network scanning or a fabricated security score |
| [Frappe users and permissions](https://docs.frappe.io/framework/user/en/basics/users-and-permissions) | Enforce access on the backend | Owner-scoped security posture and server-generated workspace-save events | Client-selected workspace IDs or claims of shared role-based tenancy |
| [OWASP HTML5 security](https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html) | Treat browser storage as accessible to scripts | Explicit cache disclosure, encrypted backup files, CSP and frame protection | Claiming backups encrypt the active cache |
| [GitHub security](https://docs.github.com/en/code-security/reference) | Scan changes and maintain dependencies | Gitleaks, CodeQL, npm audit deployment gate and Dependabot | Unverified compliance or vulnerability-free claims |

## What users can do now

Open **Find → Security Center**, or use **Workspace tools → Security Center**.
Review access and data destinations. Generate a passphrase-protected `.eachlock`
backup. Enter its passphrase and select the file to decrypt locally; inspect all
changes before approving restore. A stale review or another tenant is rejected.
The source-search field is in **Add document → Hippocampus**.

## Security boundaries

Backups use Web Crypto AES-256-GCM, a random 16-byte salt and 12-byte nonce,
PBKDF2-SHA256 with 600,000 iterations, and authenticated format identification.
The file carries no plaintext company metadata. Each export uses fresh randomness.
Wrong passphrases or modified ciphertext fail before the workspace changes.
Passphrases remain in page memory and are cleared after an operation or navigation;
there is no recovery service. Use a long, unique phrase and retain it separately.
The active localStorage workspace is still plaintext.

Device activity retains only 100 metadata events and can be edited or cleared by
someone with device access. Server events are Frappe Comments scoped to the owner,
not immutable external audit storage. Two-factor checks show site policy, not
individual enrollment. Upgrade/migrate the EACH backend app to use the new endpoint.

Cloudflare `_headers` supplies CSP and security headers. The policy allows HTTPS
provider connections, local loopback AI, Google sign-in, and the OCR runtime CDN.
A client-supplied AI API key is sent only to the selected provider. Arbitrary
provider support prevents restricting `connect-src` to a single fixed domain;
a managed deployment should narrow it to its approved providers. GitHub Pages does
not apply `_headers`; equivalent headers must be configured at its proxy.

## Verification

Tests cover authenticated backup round trips, random exports, wrong passwords,
ciphertext tampering, bounded KDF parameters, activity storage failures, rejected
guest access, owner-scoped audit reads and metadata-only server events. Existing
financial, intake and mirror tests remain in place. Repository scans supplement
these tests; they do not replace an independent security review.
