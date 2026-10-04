# Data mirrors and reviewed AI intake

EACH keeps your working records in its data shim. A spreadsheet is an editable
mirror. An AI response is a proposal. You decide which changes enter the system.

## First five minutes / เริ่มในห้านาที

1. Choose **Set up my company / ตั้งค่าบริษัทของฉัน**. Enter verified company
   details and money actually paid into the business. Skip sample extraction.
2. Open **Add document / เพิ่มเอกสาร**. Choose **Use local Ollama** or enter your
   OpenAI-compatible API base URL, model, and optional key.
3. Upload a PDF or paste business notes. Preview the extracted text. For scanned
   PDFs, enable local Thai/English OCR before selecting the file.
4. Authorize sending this document's text to the displayed endpoint. Press
   **Study document / ให้ AI อ่านเอกสาร**. Read the summary, warnings and source
   quotes. Edit fields and select only correct records.
5. **Approve & file / อนุมัติและบันทึก** adds selected records to ACT, ERP, HR or
   CRM and records the source trail in **Hippocampus**.

Hippocampus stores the document name, SHA-256 fingerprint, approval time,
provider/model, quoted evidence, and created record IDs. It does not store the
original PDF or claim to be a semantic vector database. Keep original files in
your own document archive. The source trail travels with JSON and Excel backups.

เอกสารยังไม่กลายเป็นรายการบัญชีจนกว่าคุณจะอนุมัติ ตรวจชื่อ วันที่ สกุลเงิน
จำนวนเงิน และข้อความอ้างอิงก่อนเลือกแต่ละรายการ เอกสารเดิมที่บันทึกแล้วจะถูก
ปฏิเสธเพื่อป้องกันการบันทึกซ้ำ หาก AI ไม่พบข้อมูลครบ ระบบจะแสดงข้อผิดพลาดหรือ
คำเตือนแทนการเติมข้อมูลเอง

## AI connection

The browser calls an OpenAI-compatible `/v1/chat/completions` endpoint. Enter the
base URL ending in `/v1`, not the complete `/chat/completions` path. The key stays
in component memory; it is never written to localStorage, a spreadsheet, a
backup, or the source trail. It is cleared after filing or leaving intake.

For a local model:

```bash
ollama pull qwen2.5:7b-instruct
ollama serve
```

The local preset uses `http://127.0.0.1:11434/v1` and `qwen2.5:7b-instruct`.
Change the model name to one you have installed. LM Studio also works when its
OpenAI-compatible server is enabled. Configure the local server to accept the
EACH origin through CORS. If an HTTPS-hosted EACH cannot reach local HTTP, run
EACH locally; do not weaken browser security to bypass a blocked connection.

For a hosted provider, use HTTPS. Check whether its browser API allows your
origin and user-supplied keys. Hosted calls transmit the extracted document
text to that provider. Read its retention settings before using private records.
Administrators should use an authenticated gateway with server-side environment
secrets for shared organization keys; never put a provider secret in `VITE_*`.

PDF text extraction happens locally. Optional scanned-page OCR runs in the
browser through Tesseract with English and Thai language files downloaded on
first use. Those downloads do not receive the document. OCR is slower and can
misread text: preview the result before asking AI to study it. Limits are 10 MB,
100 PDF pages, 20 OCR pages, and 100,000 extracted characters. Password-protected
or damaged documents fail without filing records.

## Excel files: no account required

Open **Data mirrors / สำเนาข้อมูล → Export Excel workbook**. One `.xlsx` file
contains editable collection tabs, Metadata, and instructions. Open it in Excel
on your computer or Excel Online. Keep the tab names, headers and IDs.

- Change a value to update a record.
- Add a row with a unique ID to add a record.
- Delete a row to propose removing that record.
- Nested `checklist`, `notes`, `files`, `keyResults`, and source `records` use JSON.
- Paste values into data tabs. Formula and rich-text cells are rejected on import.

Import through **Review an edited workbook**. Review the add/change/remove counts
and incoming values. Approval replaces the workspace with that snapshot. A
changed local workspace or another company's workbook blocks approval. Download
JSON backup before a replacement. Excel file exchange is two-way and explicit;
it does not promise continuous OneDrive background synchronization.

## Google Apps Script bridge

The **Google Sheets** connection dialog bundles `sheets/apps-script.gs`.
Deploy it as the accessing user with account-restricted access and configure
`EACH_ALLOWED_EMAILS`. Anonymous deployment is refused. The browser must be able
to read the authenticated Web App; some Google deployment/CORS configurations
will prevent this. Use the Frappe Sheets API connector below if the bridge cannot
be reached. Do not switch a business-data deployment to anonymous access.

This bridge uses explicit **Send local copy** and **Pull from Sheet** actions.
Pulls open the same review as Excel imports. Writes check a remote revision under
an Apps Script lock and then read the workbook back. An opaque `no-cors` response
alone never marks the mirror saved. External Sheet editors do not participate in
the script lock: pause manual editing while sending.

## Authenticated cloud connectors (administrator)

Cloud connectors require a running Frappe backend, a signed-in Frappe user, and
an assigned workbook for that user. The public static demonstration cannot hold
organization credentials or configure these services on your behalf.

1. Export an EACH `.xlsx` workbook from the company workspace.
2. For Microsoft, upload it to the configured OneDrive/SharePoint drive. For
   Google, import/convert it to a native Google spreadsheet. Keep all data tabs.
3. Configure `each_mirrors` in the server's `site_config.json`, keyed by the exact
   authenticated Frappe user. IDs and environment variable names are configuration;
   secret values remain in the Frappe process environment.

```json
{
  "each_mirrors": {
    "founder@example.com": {
      "google": {
        "spreadsheet_id": "YOUR_SPREADSHEET_ID",
        "credentials_env": "EACH_GOOGLE_SERVICE_ACCOUNT_JSON"
      },
      "microsoft": {
        "drive_id": "YOUR_DRIVE_ID",
        "item_id": "YOUR_WORKBOOK_ITEM_ID",
        "access_token_env": "EACH_MICROSOFT_ACCESS_TOKEN"
      }
    }
  }
}
```

For Google, enable the Sheets API, create a service account, share only the
assigned spreadsheet with that account, and supply its credentials through the
named environment secret. The connector uses the `spreadsheets` scope and RAW
cell writes.

For Microsoft, provide a **delegated** token with `Files.ReadWrite`. Workbook
range APIs do not support app-only application permissions. The token expires:
your administrator must refresh it through the organization's OAuth mechanism
and update the server environment. Automatic OAuth onboarding/token renewal is
not implemented. Use a supported Microsoft 365 workbook/drive and verify its
permissions. A missing or expired token produces an error, never a fake sync.

The UI shows connections assigned to the signed-in user. **Review incoming
changes** reads the workbook without writing. **Review before sending** shows
how EACH will change that workbook; approval persists the local snapshot to
Frappe, checks the remote revision, transfers, and reads it back to verify.

A cloud spreadsheet API cannot provide an atomic transaction across all tabs or
lock out human coauthors. Google batches cell updates; Microsoft updates ranges
sequentially. A partial failure can leave a partially updated mirror, while EACH
retains its local/database copy. Pause coauthoring during transfers, keep backups,
and read/review the remote workbook after a failed write before retrying.

## What has and has not been verified

Tests cover atomic approvals, source evidence, duplicate documents, input
validation, workbook round trips, formula rejection, review conflicts, and the
server mirror codec. Browser checks use synthetic documents and demo records.
A real Google/Microsoft transfer must be verified against your configured account
before a startup relies on that mirror. Native ERPNext/Frappe CRM/HR DocType
mapping, multi-user role policy, and production deployment remain separate gates.

API references: [Microsoft range updates](https://learn.microsoft.com/en-us/graph/api/range-update?view=graph-rest-1.0),
[Google Sheets batch values](https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets.values/batchUpdate),
[Ollama compatibility](https://docs.ollama.com/api/openai-compatibility).
