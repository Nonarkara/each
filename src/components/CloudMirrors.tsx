import { useEffect, useState } from 'react'
import { Btn } from './ui/Axiom'
import { MirrorReview } from './MirrorReview'
import { useLanguage } from '../lib/languageContext'
import type { EachStore } from '../lib/types'
import { applyReviewedMirror, canonical } from '../lib/mirror'
import { storeApi } from '../lib/store'
import { cloudMirrorStatus, readCloudMirror, writeCloudMirror, type MirrorProvider } from '../services/cloudMirrors'
import { frappeClient } from '../services/api'
export function CloudMirrors({ store }: { store: EachStore }) {
  const { t } = useLanguage()
  const [connections, setConnections] = useState({ google: false, microsoft: false })
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [review, setReview] = useState<{ before: EachStore; after: EachStore; local: EachStore; revision: string; provider: MirrorProvider; direction: 'pull' | 'push' } | null>(null)
  useEffect(() => { let active = true; void cloudMirrorStatus().then(status => { if (active) setConnections(status) }).catch(() => { if (active) setMessage(t('Cloud mirrors require an authenticated backend connection.', 'สำเนาบนคลาวด์ต้องเชื่อมต่อฐานข้อมูลที่ยืนยันตัวตนแล้ว')) }); return () => { active = false } }, [t])
  async function start(provider: MirrorProvider, direction: 'pull' | 'push') {
    setBusy(true); setMessage(''); setReview(null)
    try {
      const local = structuredClone(storeApi.get())
      const remote = await readCloudMirror(provider)
      if (local.companyName !== remote.state.companyName || local.dataTenant !== remote.state.dataTenant) throw new Error(t('Connect a workbook for this company. Start by uploading the exported Excel workbook.', 'ใช้เวิร์กบุ๊กของบริษัทนี้ เริ่มจากอัปโหลดไฟล์ Excel ที่ส่งออก'))
      setReview({ local, before: direction === 'pull' ? local : remote.state, after: direction === 'pull' ? remote.state : local, revision: remote.revision, provider, direction })
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Mirror failed') } finally { setBusy(false) }
  }
  async function approve() {
    if (!review) return
    setBusy(true); setMessage('')
    try {
      if (canonical(storeApi.get()) !== canonical(review.local)) throw new Error(t('Workspace changed. Review again.', 'ข้อมูลเปลี่ยน กรุณาตรวจใหม่'))
      if (review.direction === 'pull') {
        const latest = await readCloudMirror(review.provider)
        if (latest.revision !== review.revision) throw new Error(t('Spreadsheet changed. Review again.', 'สเปรดชีตเปลี่ยน กรุณาตรวจใหม่'))
        storeApi.load(applyReviewedMirror(storeApi.get(), review.local, review.after))
        setMessage(t('Reviewed spreadsheet changes saved in EACH.', 'บันทึกข้อมูลสเปรดชีตที่ตรวจแล้วใน EACH'))
      } else {
        await frappeClient.putStore(review.local)
        if (canonical(storeApi.get()) !== canonical(review.local)) throw new Error(t('Workspace changed. Review again.', 'ข้อมูลเปลี่ยน กรุณาตรวจใหม่'))
        await writeCloudMirror(review.provider, review.local, review.revision)
        setMessage(t('Cloud mirror saved and read back successfully.', 'บันทึกสำเนาคลาวด์และอ่านกลับมาตรวจสำเร็จ'))
      }
      setReview(null)
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Transfer failed') } finally { setBusy(false) }
  }
  return <section className="space-y-4 border-t-2 border-ink pt-4">
    <h3 className="font-display text-[14px] font-bold">{t('Connected cloud workbooks', 'เวิร์กบุ๊กคลาวด์ที่เชื่อมต่อ')}</h3>
    <p>{t('Google Sheets API and Microsoft Graph connectors run on your authenticated Frappe server. Your administrator assigns a workbook to your account. Provider credentials stay on the server. Pause spreadsheet coauthoring while sending; cloud APIs cannot make a multi-tab transfer atomic.', 'ตัวเชื่อม Google Sheets API และ Microsoft Graph ทำงานบน Frappe ที่ยืนยันตัวตน ผู้ดูแลผูกเวิร์กบุ๊กกับบัญชีของคุณ คีย์ผู้ให้บริการอยู่บนเซิร์ฟเวอร์ หยุดแก้ไขร่วมกันขณะส่งข้อมูล เพราะ API ไม่รับประกันการส่งหลายแท็บเป็นธุรกรรมเดียว')}</p>
    <div className="grid gap-px border border-line bg-line sm:grid-cols-2">{(['google', 'microsoft'] as const).map(provider => <div key={provider} className="space-y-3 bg-panel p-4"><p className="font-semibold">{provider === 'google' ? 'Google Sheets API' : 'Microsoft Excel Online'}</p><p>{connections[provider] ? t('Configured for your server account', 'ตั้งค่าสำหรับบัญชีเซิร์ฟเวอร์ของคุณแล้ว') : t('Not connected · ask your administrator to configure this workbook', 'ยังไม่เชื่อมต่อ · ให้ผู้ดูแลตั้งค่าเวิร์กบุ๊กนี้')}</p><div className="flex flex-wrap gap-2"><Btn variant="ghost" disabled={busy || !connections[provider]} onClick={() => void start(provider, 'pull')}>{t('Review incoming changes', 'ตรวจข้อมูลที่จะรับ')}</Btn><Btn variant="ghost" disabled={busy || !connections[provider] || store.dataTenant === 'abc'} onClick={() => void start(provider, 'push')}>{t('Review before sending', 'ตรวจก่อนส่งข้อมูล')}</Btn></div></div>)}</div>
    {busy ? <p role="status">{t('Transferring…', 'กำลังรับส่ง…')}</p> : null}{message ? <p role="status" className="border-l-2 border-amber p-3">{message}</p> : null}
    {review && !busy ? <><p>{review.direction === 'push' ? t('Destination: cloud workbook. The approval below sends EACH data to this workbook.', 'ปลายทาง: เวิร์กบุ๊กคลาวด์ การอนุมัติด้านล่างจะส่งข้อมูล EACH ไปยังเวิร์กบุ๊กนี้') : t('Destination: your EACH workspace.', 'ปลายทาง: พื้นที่ทำงาน EACH ของคุณ')}</p><MirrorReview destination={review.direction === 'push' ? 'cloud' : 'local'} before={review.before} after={review.after} onCancel={() => setReview(null)} onApprove={() => void approve()} /></> : null}
  </section>
}
