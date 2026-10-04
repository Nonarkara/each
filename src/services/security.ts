export interface ServerSecurity {
  checkedAt: string;
  ownerIsolation: boolean;
  twoFactorPolicy: boolean;
  audit: { at: string; action: string }[];
}
const base = String(import.meta.env.VITE_FRAPPE_URL || "").replace(/\/$/, "");
export async function checkServerSecurity(): Promise<ServerSecurity> {
  if (!base)
    throw new Error(
      "Connect an authenticated Frappe backend / เชื่อมต่อ Frappe ที่ยืนยันตัวตนก่อน",
    );
  const response = await fetch(
    `${base}/api/method/each_backend.security.posture`,
    { credentials: "include", signal: AbortSignal.timeout(15000) },
  );
  if (!response.ok)
    throw new Error(
      "Backend check failed. Check your session and upgrade the backend app. / ตรวจไม่สำเร็จ ตรวจบัญชีและอัปเดตแอปฝั่งเซิร์ฟเวอร์",
    );
  const result = (await response.json()).message;
  if (
    !result ||
    typeof result.checkedAt !== "string" ||
    typeof result.ownerIsolation !== "boolean" ||
    typeof result.twoFactorPolicy !== "boolean" ||
    !Array.isArray(result.audit)
  )
    throw new Error("Invalid security response");
  return result;
}
