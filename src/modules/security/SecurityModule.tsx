import { useState } from "react";
import { Btn, Input, Station } from "../../components/ui/Axiom";
import { MirrorReview } from "../../components/MirrorReview";
import { useLanguage } from "../../lib/languageContext";
import { encryptBackup, decryptBackup } from "../../lib/encryptedBackup";
import { applyReviewedMirror } from "../../lib/mirror";
import { storeApi } from "../../lib/store";
import {
  readSecurityActivity,
  recordSecurityActivity,
  type SecurityEventKind,
} from "../../lib/securityActivity";
import { isFrappeEnabled } from "../../services/api";
import {
  checkServerSecurity,
  type ServerSecurity,
} from "../../services/security";
import type { EachStore } from "../../lib/types";
function download(text: string, name: string) {
  const url = URL.createObjectURL(
    new Blob([text], { type: "application/json" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function SecurityModule({
  store,
  onMirrors,
}: {
  store: EachStore;
  onMirrors: () => void;
}) {
  const { t } = useLanguage();
  const [pass, setPass] = useState(""),
    [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const [server, setServer] = useState<ServerSecurity | null>(null);
  const [review, setReview] = useState<{
    before: EachStore;
    after: EachStore;
  } | null>(null);
  const secureTransport = location.protocol === "https:";
  const events = readSecurityActivity().slice().reverse();
  const eventName = (kind: SecurityEventKind) =>
    ({
      workspace_saved: t(
        "Workspace saved locally",
        "บันทึกพื้นที่ทำงานในเครื่อง",
      ),
      encrypted_backup_generated: t(
        "Encrypted backup generated",
        "สร้างข้อมูลสำรองเข้ารหัส",
      ),
      encrypted_restore_approved: t(
        "Encrypted restore approved",
        "อนุมัติกู้คืนข้อมูลเข้ารหัส",
      ),
      ai_document_sent: t("AI transfer requested", "ขอส่งข้อมูลไปยัง AI"),
      ai_records_approved: t("AI records approved", "อนุมัติรายการจาก AI"),
    })[kind];
  async function backup() {
    setBusy(true);
    setMessage("");
    try {
      if (pass !== confirm)
        throw new Error(t("Passphrases do not match", "รหัสผ่านไม่ตรงกัน"));
      const encrypted = await encryptBackup(storeApi.get(), pass);
      download(
        encrypted,
        `EACH-${new Date().toISOString().slice(0, 10)}.eachlock`,
      );
      recordSecurityActivity("encrypted_backup_generated");
      setMessage(
        t(
          "Encrypted backup generated. Keep the file and passphrase separately, then test a restore.",
          "สร้างไฟล์สำรองเข้ารหัสแล้ว เก็บไฟล์และรหัสผ่านแยกกัน และทดลองกู้คืน",
        ),
      );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Backup failed");
    } finally {
      setPass("");
      setConfirm("");
      setBusy(false);
    }
  }
  async function restore(file?: File) {
    if (!file) return;
    setBusy(true);
    setMessage("");
    setReview(null);
    const before = structuredClone(storeApi.get());
    try {
      if (file.size > 3_000_000)
        throw new Error(t("File exceeds 3 MB", "ไฟล์เกิน 3 MB"));
      const after = await decryptBackup(await file.text(), pass);
      applyReviewedMirror(storeApi.get(), before, after);
      setReview({ before, after });
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Restore failed");
    } finally {
      setPass("");
      setConfirm("");
      setBusy(false);
    }
  }
  const checks = [
    [
      t("Connection", "การเชื่อมต่อ"),
      secureTransport
        ? t("Observed: HTTPS", "ตรวจพบ HTTPS")
        : t("HTTP · local testing only", "HTTP · ใช้ทดลองในเครื่องเท่านั้น"),
      t(
        "Use HTTPS on a shared or public deployment. This checks this page, not provider endpoints.",
        "ใช้ HTTPS เมื่อเปิดให้ใช้ร่วมกันหรือสาธารณะ ตรวจเฉพาะหน้านี้ ไม่รวม API ภายนอก",
      ),
    ],
    [
      t("Workspace access", "สิทธิ์พื้นที่ทำงาน"),
      server?.ownerIsolation
        ? t(
            "Verified by authenticated backend",
            "ยืนยันจากเซิร์ฟเวอร์ที่เข้าสู่ระบบแล้ว",
          )
        : t("Needs backend verification", "ต้องตรวจผ่านเซิร์ฟเวอร์"),
      t(
        "Browser workspaces have no multi-user access control. Server access is scoped to the signed-in owner; administrator access remains privileged.",
        "ข้อมูลในเบราว์เซอร์ไม่มีการแยกสิทธิ์ผู้ใช้หลายคน เซิร์ฟเวอร์แยกข้อมูลตามเจ้าของที่เข้าสู่ระบบ ผู้ดูแลยังมีสิทธิ์พิเศษ",
      ),
    ],
    [
      t("Two-factor authentication", "ยืนยันตัวตนสองขั้นตอน"),
      server
        ? server.twoFactorPolicy
          ? t("Site policy enabled", "เปิดนโยบายระดับไซต์แล้ว")
          : t("Site policy disabled", "ยังไม่เปิดนโยบายระดับไซต์")
        : t("Not checked", "ยังไม่ตรวจ"),
      t(
        "Enable two-factor authentication in Frappe System Settings. Site policy does not prove that every account is enrolled.",
        "เปิดการยืนยันสองขั้นตอนใน System Settings ของ Frappe นโยบายระดับไซต์ไม่ได้ยืนยันว่าทุกบัญชีตั้งค่าแล้ว",
      ),
    ],
    [
      t("Data on this device", "ข้อมูลในอุปกรณ์นี้"),
      t("Plaintext browser cache", "ข้อมูลเบราว์เซอร์ไม่เข้ารหัส"),
      t(
        "Use a trusted device with disk encryption and screen lock. Encrypted exports protect backup files; the active workspace still uses localStorage.",
        "ใช้เครื่องที่เชื่อถือได้ เปิดเข้ารหัสดิสก์และล็อกหน้าจอ ไฟล์สำรองเข้ารหัสช่วยป้องกันไฟล์ แต่พื้นที่ทำงานยังใช้ localStorage",
      ),
    ],
    [
      t("AI and spreadsheet transfers", "รับส่งข้อมูลกับ AI และชีต"),
      t("Explicit review and consent", "ตรวจและอนุญาตก่อนรับส่ง"),
      t(
        "AI receives text only when requested. Review destination permissions; a mirror is another copy of your data.",
        "AI รับข้อความเมื่อคุณสั่งเท่านั้น ตรวจสิทธิ์ปลายทาง สำเนาข้อมูลคือข้อมูลอีกชุดที่ต้องดูแล",
      ),
    ],
  ];
  return (
    <section className="space-y-5">
      <Station
        disc="SEC"
        kicker={t(
          "Evidence, protection, recovery",
          "หลักฐาน การป้องกัน การกู้คืน",
        )}
        title={t("Security Center", "ศูนย์ความปลอดภัย")}
        meta={store.companyName}
      />
      <p className="max-w-2xl">
        {t(
          "Protect company records with a clear view of what EACH can verify. Start with access, create an encrypted backup, and rehearse recovery. This page does not scan your network or certify compliance.",
          "ดูสิ่งที่ EACH ตรวจยืนยันได้เพื่อปกป้องข้อมูลบริษัท เริ่มจากสิทธิ์เข้าถึง สร้างข้อมูลสำรองเข้ารหัส และทดลองกู้คืน หน้านี้ไม่ได้สแกนเครือข่ายหรือรับรองมาตรฐาน",
        )}
      </p>
      <div className="flex flex-wrap gap-3">
        <Btn
          disabled={busy || !isFrappeEnabled()}
          onClick={async () => {
            setBusy(true);
            setMessage("");
            setServer(null);
            try {
              setServer(await checkServerSecurity());
            } catch (e) {
              setMessage(e instanceof Error ? e.message : "Check failed");
            } finally {
              setBusy(false);
            }
          }}
        >
          {t("Check authenticated backend", "ตรวจเซิร์ฟเวอร์ที่เข้าสู่ระบบ")}
        </Btn>
        <Btn variant="ghost" onClick={onMirrors}>
          {t("Review data destinations", "ตรวจปลายทางข้อมูล")}
        </Btn>
      </div>
      {server ? (
        <p className="font-mono text-[11px]">
          {t("Backend checked", "ตรวจเซิร์ฟเวอร์เมื่อ")}{" "}
          {new Date(server.checkedAt).toLocaleString()}
        </p>
      ) : null}
      <div className="grid gap-px border border-line bg-line">
        {checks.map(([title, status, detail]) => (
          <article
            key={title}
            className="grid gap-3 bg-panel p-4 md:grid-cols-[1fr_1fr_2fr]"
          >
            <h3 className="font-semibold">{title}</h3>
            <p className="font-mono text-[11px] uppercase">{status}</p>
            <p>{detail}</p>
          </article>
        ))}
      </div>
      <section className="space-y-4 border border-line bg-panel p-4">
        <h3 className="font-display text-[14px] font-bold">
          {t(
            "Encrypted backup & reviewed restore",
            "สำรองข้อมูลเข้ารหัสและตรวจการกู้คืน",
          )}
        </h3>
        <p>
          {t(
            "Choose a unique passphrase with at least 12 characters. EACH cannot recover it. Enter the passphrase, then export a backup or select a .eachlock file to decrypt locally. Decryption shows a change review before replacing records.",
            "ใช้รหัสผ่านไม่ซ้ำยาวอย่างน้อย 12 ตัวอักษร EACH กู้รหัสผ่านให้ไม่ได้ ใส่รหัสผ่านเพื่อส่งออกหรือเลือกไฟล์ .eachlock เพื่อถอดรหัสในเครื่อง ระบบแสดงการเปลี่ยนแปลงก่อนแทนที่ข้อมูล",
          )}
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label>
            {t("Backup passphrase", "รหัสผ่านข้อมูลสำรอง")}
            <Input
              type="password"
              autoComplete="off"
              value={pass}
              disabled={busy}
              onChange={(e) => setPass(e.target.value)}
            />
          </label>
          <label>
            {t("Repeat for export", "ใส่อีกครั้งเพื่อส่งออก")}
            <Input
              type="password"
              autoComplete="off"
              value={confirm}
              disabled={busy}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </label>
        </div>
        <div className="flex flex-wrap gap-3">
          <Btn
            onClick={() => void backup()}
            disabled={busy || pass.length < 12 || pass !== confirm}
          >
            {busy
              ? t("Working…", "กำลังทำงาน…")
              : t("Download encrypted backup", "ดาวน์โหลดสำรองเข้ารหัส")}
          </Btn>
          <label className="block">
            {t("Review encrypted backup", "ตรวจไฟล์สำรองเข้ารหัส")}
            <input
              type="file"
              accept=".eachlock,application/json"
              disabled={busy || pass.length < 12}
              className="block min-h-[44px] max-w-full border border-line p-2"
              onChange={(e) => {
                void restore(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>
        </div>
      </section>
      {message ? (
        <p
          role="status"
          className="border-l-2 border-amber bg-panel p-4 break-words"
        >
          {message}
        </p>
      ) : null}
      {review ? (
        <MirrorReview
          {...review}
          onCancel={() => setReview(null)}
          onApprove={() => {
            try {
              storeApi.load(
                applyReviewedMirror(
                  storeApi.get(),
                  review.before,
                  review.after,
                ),
              );
              recordSecurityActivity("encrypted_restore_approved");
              setReview(null);
              setMessage(
                t("Reviewed backup restored.", "กู้คืนข้อมูลที่ตรวจแล้ว"),
              );
            } catch (e) {
              setMessage(e instanceof Error ? e.message : "Restore failed");
            }
          }}
        />
      ) : null}
      <details className="border border-line p-4">
        <summary className="min-h-[44px] cursor-pointer font-semibold">
          {t("If you suspect a leak", "หากสงสัยว่าข้อมูลรั่วไหล")}
        </summary>
        <ol className="list-decimal space-y-3 pl-5">
          <li>
            {t(
              "Stop AI and mirror transfers. Preserve evidence and record the time; avoid sharing the affected data in tickets.",
              "หยุดส่งข้อมูลไป AI และชีต เก็บหลักฐานและเวลา อย่าแนบข้อมูลที่รั่วในรายงาน",
            )}
          </li>
          <li>
            {t(
              "Ask your administrator to revoke affected sessions, rotate provider credentials, and review workbook sharing.",
              "ให้ผู้ดูแลเพิกถอนเซสชันที่เกี่ยวข้อง เปลี่ยนคีย์ และตรวจการแชร์เวิร์กบุ๊ก",
            )}
          </li>
          <li>
            {t(
              "Restore only after containment. Compare an encrypted backup before approving replacement.",
              "กู้คืนหลังควบคุมเหตุแล้ว เปรียบเทียบไฟล์สำรองก่อนอนุมัติแทนที่",
            )}
          </li>
        </ol>
      </details>
      <section className="space-y-3">
        <h3 className="font-display text-[14px] font-bold">
          {t("Recent activity on this device", "กิจกรรมล่าสุดในอุปกรณ์นี้")}
        </h3>
        <p>
          {t(
            "Last 100 events, stored locally without document text, keys or payroll fields. This device log can be changed or cleared; it is not a tamper-proof audit. Events cover workspace saves, AI transfers/approvals and encrypted backups.",
            "เก็บ 100 เหตุการณ์ล่าสุดในเครื่อง ไม่เก็บข้อความเอกสาร คีย์ หรือเงินเดือน บันทึกนี้แก้ไขหรือล้างได้ จึงไม่ใช่หลักฐานที่ป้องกันการแก้ไข ครอบคลุมการบันทึกพื้นที่ การส่ง/อนุมัติ AI และสำรองเข้ารหัส",
          )}
        </p>
        {events.length ? (
          <ul className="divide-y divide-line border border-line">
            {events.map((e, i) => (
              <li
                key={i}
                className="flex flex-wrap justify-between gap-2 bg-panel p-3"
              >
                <span>
                  {eventName(e.kind)}
                  {e.count ? ` · ${e.count}` : ""}
                </span>
                <time className="font-mono text-[11px]">
                  {new Date(e.at).toLocaleString()}
                </time>
              </li>
            ))}
          </ul>
        ) : (
          <p>{t("No recorded events yet.", "ยังไม่มีเหตุการณ์ที่บันทึก")}</p>
        )}
      </section>
      {server ? (
        <section className="space-y-3">
          <h3 className="font-semibold">
            {t(
              "Backend workspace activity",
              "กิจกรรมพื้นที่ทำงานบนเซิร์ฟเวอร์",
            )}
          </h3>
          <p>
            {t(
              "Recent owner-scoped save events recorded by the server. Administrators can manage these logs; configure external retention for an independent audit.",
              "เหตุการณ์บันทึกข้อมูลล่าสุดของเจ้าของที่เซิร์ฟเวอร์บันทึก ผู้ดูแลจัดการบันทึกนี้ได้ ควรเก็บภายนอกหากต้องการตรวจสอบอิสระ",
            )}
          </p>
          {server.audit.map((e, i) => (
            <p key={i}>
              {e.action} · {e.at}
            </p>
          ))}
        </section>
      ) : null}
    </section>
  );
}
