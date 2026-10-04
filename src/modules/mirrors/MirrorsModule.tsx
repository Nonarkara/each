import { CloudMirrors } from '../../components/CloudMirrors'
import { useState } from 'react'
import { Btn, Station } from '../../components/ui/Axiom'
import { MirrorReview } from '../../components/MirrorReview'
import { useLanguage } from '../../lib/languageContext'
import { storeApi } from '../../lib/store'
import type { EachStore } from '../../lib/types'
import { applyReviewedMirror } from '../../lib/mirror'
import { exportWorkbook, readWorkbook } from '../../services/workbook'
import { exportJsonBackup } from '../../services/sheets'
export function MirrorsModule({ store, onGoogle }: { store: EachStore; onGoogle: () => void }) {
  const { t } = useLanguage()
  const [review, setReview] = useState<{ before: EachStore; after: EachStore } | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  async function run(job: () => Promise<void>) { setBusy(true); setMessage(''); try { await job() } catch (e) { setMessage(e instanceof Error ? e.message : 'Workbook failed') } finally { setBusy(false) } }
  return <section className="space-y-5">
    <Station disc="↔" kicker={t('Your data, in both directions', 'ข้อมูลของคุณ รับส่งได้สองทาง')} title={t('Data mirrors', 'สำเนาข้อมูล')} />
    <p className="max-w-2xl">{t('Keep an editable spreadsheet copy of your workspace. Export your records, work in the spreadsheet, then review changes before bringing them back. A mirror is an extra copy; download backups too.', 'เก็บสำเนาข้อมูลที่แก้ไขได้ในสเปรดชีต ส่งออก แก้ในสเปรดชีต แล้วตรวจการเปลี่ยนแปลงก่อนนำกลับ สำเนาช่วยให้มีข้อมูลอีกชุด ควรดาวน์โหลดข้อมูลสำรองด้วย')}</p>
    <div className="grid gap-px border border-line bg-line md:grid-cols-[2fr_1fr]">
      <section className="space-y-4 bg-panel p-4"><h3 className="font-display text-[14px] font-bold">Microsoft Excel · .xlsx</h3><p>{t('One workbook contains each collection in its own tab, including approved document evidence. Keep IDs and headers; change values or add rows with unique IDs. Importing does not write until you approve.', 'เวิร์กบุ๊กเดียวมีแท็บแยกแต่ละชุดข้อมูล รวมหลักฐานเอกสารที่อนุมัติ คง ID และหัวตาราง แก้ค่า หรือเพิ่มแถวโดยใช้ ID ไม่ซ้ำ ระบบจะไม่บันทึกการนำเข้าจนกว่าคุณจะอนุมัติ')}</p><p>{t('Two-way file exchange. Excel Online and desktop Excel can edit the workbook; automatic OneDrive sync is not configured.', 'รับส่งสองทางผ่านไฟล์ แก้ได้ทั้ง Excel Online และ Excel บนคอมพิวเตอร์ ยังไม่มีซิงค์ OneDrive อัตโนมัติ')}</p><Btn disabled={busy} onClick={() => void run(() => exportWorkbook(store))}>{t('Export Excel workbook', 'ส่งออกเวิร์กบุ๊ก Excel')}</Btn><label className="block border border-line p-3">{t('Review an edited workbook', 'ตรวจเวิร์กบุ๊กที่แก้ไขแล้ว')}<input type="file" className="mt-2 min-h-[44px] w-full" accept=".xlsx" disabled={busy} onChange={e => { const file = e.target.files?.[0]; if (file) void run(async () => { const before = structuredClone(storeApi.get()); const after = await readWorkbook(file); setReview({ before, after }) }); e.target.value = '' }} /></label></section>
      <section className="space-y-4 bg-panel p-4"><h3 className="font-display text-[14px] font-bold">Google Sheets</h3><p>{t('Connect your Apps Script workbook. Bring back edited rows through a review. The bridge requires an authenticated Google deployment and browser access; a failed connection is shown as an error.', 'เชื่อมต่อเวิร์กบุ๊ก Apps Script แล้วตรวจแถวที่แก้ไขก่อนนำกลับ ต้องใช้การติดตั้งที่ยืนยันบัญชี Google และเบราว์เซอร์เข้าถึงได้ ระบบจะแสดงข้อผิดพลาดเมื่อเชื่อมต่อไม่สำเร็จ')}</p><Btn variant="ghost" onClick={onGoogle}>{t('Connect Google Sheets', 'เชื่อมต่อ Google Sheets')}</Btn><p>{t('Keep a restorable snapshot before an import.', 'เก็บข้อมูลสำรองที่กู้คืนได้ก่อนนำเข้า')}</p><Btn variant="ghost" onClick={() => exportJsonBackup(store)}>{t('Download JSON backup', 'ดาวน์โหลดข้อมูลสำรอง JSON')}</Btn></section>
    </div>
    <CloudMirrors store={store} />
    {busy ? <p role="status">{t('Reading workbook…', 'กำลังอ่านเวิร์กบุ๊ก…')}</p> : null}{message ? <p role="alert" className="border-l-2 border-amber p-3">{message}</p> : null}
    {review ? <MirrorReview {...review} onCancel={() => setReview(null)} onApprove={() => { try { storeApi.load(applyReviewedMirror(storeApi.get(), review.before, review.after)); setReview(null); setMessage(t('Reviewed changes saved.', 'บันทึกการเปลี่ยนแปลงที่ตรวจแล้ว')) } catch (e) { setMessage(e instanceof Error ? e.message : 'Import failed') } }} /> : null}
  </section>
}
