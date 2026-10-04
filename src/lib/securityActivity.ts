export type SecurityEventKind =
  | "workspace_saved"
  | "encrypted_backup_generated"
  | "encrypted_restore_approved"
  | "ai_document_sent"
  | "ai_records_approved";
export interface SecurityEvent {
  at: string;
  kind: SecurityEventKind;
  count: number;
}
const KEY = "each-security-activity-v1";
const kinds = new Set([
  "workspace_saved",
  "encrypted_backup_generated",
  "encrypted_restore_approved",
  "ai_document_sent",
  "ai_records_approved",
]);
export function readSecurityActivity(): SecurityEvent[] {
  try {
    const rows = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(rows)
      ? rows
          .filter(
            (x) =>
              x &&
              kinds.has(x.kind) &&
              typeof x.at === "string" &&
              Number.isSafeInteger(x.count) &&
              x.count >= 0,
          )
          .slice(-100)
      : [];
  } catch {
    return [];
  }
}
export function recordSecurityActivity(
  kind: SecurityEventKind,
  count = 0,
): void {
  if (!kinds.has(kind) || !Number.isSafeInteger(count) || count < 0) return;
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify(
        [
          ...readSecurityActivity(),
          { at: new Date().toISOString(), kind, count },
        ].slice(-100),
      ),
    );
  } catch {
    /* Activity failure must not discard an already saved workspace. */
  }
}
