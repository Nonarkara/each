import type { EachStore } from '../lib/types'
import { mirrorChanges } from '../lib/mirror'
import { useLanguage } from '../lib/languageContext'
import { Btn, DataTable } from './ui/Axiom'
export function MirrorReview({ before, after, onApprove, onCancel, destination = 'local' }: { before: EachStore; after: EachStore; onApprove: () => void; onCancel: () => void; destination?: 'local' | 'cloud' }) {
  const { t } = useLanguage()
  const diff = mirrorChanges(before, after)
  const changed = diff.changes.filter(r => r.added || r.changed || r.removed)
  return <section className="space-y-4 border-t-2 border-ink pt-4">
    <h3 className="font-display text-[14px] font-bold">{t('Review incoming changes', 'ตรวจข้อมูลที่จะนำเข้า')}</h3>
    <p>{destination === 'cloud' ? t('Approval replaces the cloud workbook with these reviewed values. Missing rows will be cleared. Keep a backup and pause spreadsheet edits during the transfer.', 'การอนุมัติจะแทนที่เวิร์กบุ๊กคลาวด์ด้วยค่าที่ตรวจนี้ แถวที่ไม่มีจะถูกล้าง กรุณาสำรองและหยุดแก้ไขระหว่างรับส่ง') : t('Approval replaces your workspace with this reviewed snapshot. Download a backup first if you need to undo. Missing rows will be removed.', 'การอนุมัติจะแทนที่ข้อมูลด้วยสำเนาที่ตรวจนี้ ดาวน์โหลดข้อมูลสำรองก่อนหากต้องการย้อนกลับ แถวที่ไม่มีในสำเนาจะถูกลบ')}</p>
    <DataTable><thead><tr>{[t('Collection', 'ชุดข้อมูล'), t('Add', 'เพิ่ม'), t('Change', 'แก้ไข'), t('Remove', 'ลบ')].map(h => <th key={h} className="p-3">{h}</th>)}</tr></thead><tbody>{changed.map(r => <tr key={r.collection} className="border-t border-line"><td className="p-3">{r.collection}</td><td className="p-3">{r.added}</td><td className="p-3">{r.changed}</td><td className="p-3">{r.removed}</td></tr>)}</tbody></DataTable>
    <p>{diff.metadataChanged ? t('Company or workspace settings also change.', 'ข้อมูลบริษัทหรือการตั้งค่าพื้นที่ทำงานเปลี่ยนด้วย') : t('Workspace settings stay the same.', 'การตั้งค่าพื้นที่ทำงานเหมือนเดิม')}</p>
    <details><summary className="min-h-[44px] cursor-pointer py-3">{t('Inspect all incoming values', 'ดูค่าทั้งหมดที่จะนำเข้า')}</summary><pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words font-mono text-[11px]">{JSON.stringify(after, null, 2)}</pre></details>
    <div className="flex flex-wrap gap-3"><Btn onClick={onApprove} disabled={!changed.length && !diff.metadataChanged}>{t('Approve changes', 'อนุมัติการเปลี่ยนแปลง')}</Btn><Btn variant="ghost" onClick={onCancel}>{t('Cancel', 'ยกเลิก')}</Btn></div>
  </section>
}
