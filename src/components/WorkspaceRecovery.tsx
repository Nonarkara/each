import { Btn } from './ui/Axiom'
import { LanguageSwitch, } from '../lib/language'
import { useLanguage } from '../lib/languageContext'
import { preservedWorkspaceJson } from '../lib/store'
export function WorkspaceRecovery({ error, onRestore, onReset }: { error: string; onRestore: () => void; onReset: () => void }) {
  const { t } = useLanguage()
  function download() {
    const url = URL.createObjectURL(new Blob([preservedWorkspaceJson()], { type: 'application/json' }))
    const link = document.createElement('a'); link.href = url; link.download = 'each-preserved-workspace.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  return <main className="mx-auto max-w-2xl space-y-4 p-5"><LanguageSwitch /><h1 className="font-display text-[32px] font-semibold">{t('Recover your workspace', 'กู้คืนพื้นที่ทำงาน')}</h1><p role="alert">{error}</p><p>{t('Download the preserved data before resetting. You can restore a valid JSON backup. Opening this page has not replaced your saved records.', 'ดาวน์โหลดข้อมูลเดิมก่อนล้างข้อมูล คุณกู้คืนจากไฟล์ JSON ที่ถูกต้องได้ การเปิดหน้านี้ยังไม่แทนที่ข้อมูลที่บันทึกไว้')}</p><div className="flex flex-wrap gap-3"><Btn onClick={download}>{t('Download preserved data', 'ดาวน์โหลดข้อมูลเดิม')}</Btn><Btn variant="ghost" onClick={onRestore}>{t('Restore JSON backup', 'กู้คืนข้อมูลจาก JSON')}</Btn><Btn variant="ghost" onClick={onReset}>{t('Reset workspace', 'ล้างพื้นที่ทำงาน')}</Btn></div></main>
}
