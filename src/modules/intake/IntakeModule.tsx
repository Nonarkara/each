import { useRef, useState } from 'react'
import { Btn, Input, Select, Station } from '../../components/ui/Axiom'
import { useLanguage } from '../../lib/languageContext'
import { storeApi } from '../../lib/store'
import { approveDraft, parseDraft, type IntakeDraft } from '../../lib/intake'
import type { EachStore } from '../../lib/types'
import { readDocument, studyDocument, type AiConnection, type DocumentText } from '../../services/intelligence'

export function IntakeModule({ store }: { store: EachStore }) {
  const { t, language } = useLanguage()
  const [connection, setConnection] = useState<AiConnection>({ endpoint: '', model: '', key: '' })
  const [pasteText, setPasteText] = useState('')
  const [filename, setFilename] = useState('')
  const [document, setDocument] = useState<DocumentText | null>(null)
  const [draft, setDraft] = useState<IntakeDraft | null>(null)
  const [selected, setSelected] = useState<number[]>([])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [allowSend, setAllowSend] = useState(false)
  const [ocr, setOcr] = useState(false)
  const generation = useRef(0)
  const names = { expenses: t('Expense → ACT ledger', 'รายจ่าย → บัญชี ACT'), foundingCapital: t('Capital → ERP', 'เงินทุน → ERP'), employees: t('Employee → HR roster', 'พนักงาน → ทะเบียน HR'), projects: t('Deal → CRM pipeline', 'โครงการ → CRM') }
  function configure(patch: Partial<AiConnection>) { generation.current++; setConnection(c => ({ ...c, ...patch })); setAllowSend(false); setDraft(null); setSelected([]) }
  async function chooseFile(file?: File) {
    if (!file) return
    const request = ++generation.current
    setBusy(true); setMessage(''); setDraft(null); setSelected([]); setDocument(null); setAllowSend(false); setFilename(file.name)
    try { const doc = await readDocument(file, { ocr }); if (request === generation.current) setDocument(doc) }
    catch (e) { if (request === generation.current) setMessage(e instanceof Error ? e.message : 'File failed') }
    finally { if (request === generation.current) setBusy(false) }
  }
  async function study() {
    if (!document || !allowSend) return
    const request = ++generation.current
    setBusy(true); setMessage(''); setDraft(null)
    try {
      const result = await studyDocument(document, connection, store.currency, language)
      if (request === generation.current) { setDraft(result); setSelected([]) }
    } catch (e) { if (request === generation.current) setMessage(e instanceof Error ? e.message : 'AI failed') }
    finally { if (request === generation.current) setBusy(false) }
  }
  function approve() {
    if (!document || !draft) return
    try {
      const next = approveDraft(storeApi.get(), draft, selected, { name: filename, sha256: document.sha256, provider: `${new URL(connection.endpoint).origin} / ${connection.model}`, summary: draft.summary })
      storeApi.load(next)
      setDraft(null); setSelected([]); setDocument(null); setConnection(c => ({ ...c, key: '' })); setAllowSend(false)
      setMessage(t('Approved records saved. Your source trail is below.', 'บันทึกรายการที่อนุมัติแล้ว ดูหลักฐานการบันทึกด้านล่าง'))
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Approval failed') }
  }
  return <section className="space-y-5">
    <Station disc="IN" kicker={t('Human approval required', 'บันทึกเมื่อคุณอนุมัติเท่านั้น')} title={t('Document intake', 'รับข้อมูลจากเอกสาร')} />
    <p className="max-w-2xl text-[14px] leading-relaxed">{t('Upload a PDF or text file. AI reads it and proposes expenses, capital, people or deals. Check the source, edit the fields, select the records you trust, then approve. Nothing enters your workspace before that.', 'อัปโหลด PDF หรือไฟล์ข้อความ ให้ AI เสนอรายจ่าย เงินทุน พนักงาน หรือโครงการ ตรวจหลักฐาน แก้ข้อมูล เลือกรายการที่ถูกต้อง แล้วอนุมัติ ระบบจะยังไม่บันทึกข้อมูลจนกว่าคุณจะอนุมัติ')}</p>
    <div className="grid gap-px border border-line bg-line md:grid-cols-[2fr_1fr]">
      <div className="space-y-4 bg-panel p-4">
        <h3 className="font-display text-[14px] font-bold">{t('1. Choose your AI', '1. เลือก AI ที่ต้องการใช้')}</h3>
        <p>{t('Use an OpenAI-compatible /v1 endpoint from your provider or local server. Credentials stay in this tab’s memory and are cleared after filing or leaving this page.', 'ใช้ปลายทาง /v1 ที่รองรับรูปแบบ OpenAI จากผู้ให้บริการหรือเซิร์ฟเวอร์ในเครื่อง คีย์อยู่ในหน่วยความจำของแท็บเท่านั้น และจะล้างหลังบันทึกหรือออกจากหน้านี้')}</p>
        <Btn variant="ghost" disabled={busy} onClick={() => configure({ endpoint: 'http://127.0.0.1:11434/v1', model: 'qwen2.5:7b-instruct', key: '' })}>{t('Use local Ollama', 'ใช้ Ollama ในเครื่อง')}</Btn>
        <label className="block">{t('API base URL', 'URL ของ API')}<Input type="url" value={connection.endpoint} disabled={busy} onChange={e => configure({ endpoint: e.target.value })} placeholder="https://your-provider.example/v1" /></label>
        <label className="block">{t('Model name', 'ชื่อโมเดล')}<Input value={connection.model} disabled={busy} onChange={e => configure({ model: e.target.value })} /></label>
        <label className="block">{t('API key (optional for local AI)', 'API key (AI ในเครื่องอาจไม่ต้องใช้)')}<Input type="password" autoComplete="off" value={connection.key} disabled={busy} onChange={e => configure({ key: e.target.value })} /></label>
        <details><summary className="min-h-[44px] cursor-pointer py-3">{t('Using a local model', 'ใช้โมเดลในเครื่อง')}</summary><p>{t('Run Ollama or LM Studio with its OpenAI-compatible server enabled, then enter its base URL and installed model name. Permit this app’s origin in the server’s CORS settings. An HTTPS browser may block an HTTP local connection; use the local EACH app in that case.', 'เปิดเซิร์ฟเวอร์ที่รองรับ OpenAI ใน Ollama หรือ LM Studio แล้วใส่ URL และชื่อโมเดลที่ติดตั้ง ตั้งค่า CORS ให้ยอมรับต้นทางของ EACH หากเบราว์เซอร์ HTTPS บล็อก HTTP ในเครื่อง ให้เปิด EACH ในเครื่องด้วย')}</p></details>
      </div>
      <div className="space-y-4 bg-panel p-4">
        <h3 className="font-display text-[14px] font-bold">{t('2. Read the source', '2. อ่านต้นฉบับ')}</h3>
        <label className="flex min-h-[44px] items-start gap-3"><input className="mt-1 h-5 w-5 accent-amber" type="checkbox" checked={ocr} disabled={busy} onChange={e => setOcr(e.target.checked)} /><span>{t('Read scanned pages with local TH/EN OCR. Downloads language files on first use; documents stay in this browser during OCR. Up to 20 pages.', 'อ่านหน้าสแกนด้วย OCR ไทย/อังกฤษในเบราว์เซอร์ ดาวน์โหลดไฟล์ภาษาเมื่อใช้ครั้งแรก เอกสารอยู่ในเบราว์เซอร์ระหว่างทำ OCR รองรับไม่เกิน 20 หน้า')}</span></label>
        <label className="block border-2 border-dashed border-line-2 p-4">{t('Choose PDF or text · up to 10 MB', 'เลือก PDF หรือข้อความ · ไม่เกิน 10 MB')}<input className="mt-3 block min-h-[44px] w-full max-w-full text-[14px]" type="file" accept=".pdf,.txt,.md,.csv" disabled={busy} onChange={e => void chooseFile(e.target.files?.[0])} /></label>
        <details><summary className="min-h-[44px] cursor-pointer py-3">{t('Paste business notes instead', 'วางข้อมูลบริษัทแทนไฟล์')}</summary><label className="block">{t('Notes to review', 'ข้อมูลที่ต้องการตรวจ')}<textarea className="mt-2 min-h-[160px] w-full border border-line bg-panel p-3 text-[14px]" value={pasteText} disabled={busy} onChange={e => setPasteText(e.target.value)} /></label><Btn variant="ghost" disabled={busy || !pasteText.trim()} onClick={() => void chooseFile(new File([pasteText], 'business-notes.txt', { type: 'text/plain' }))}>{t('Prepare notes for review', 'เตรียมข้อมูลเพื่อตรวจ')}</Btn></details>
        <p>{t('Searchable PDFs are read in your browser. Enable OCR for image-only scans. Your document text goes only to the endpoint you choose when you press Study.', 'อ่าน PDF ที่มีข้อความในเบราว์เซอร์ เปิด OCR สำหรับเอกสารสแกนที่มีเฉพาะภาพ ข้อความจะถูกส่งไปยัง API ที่คุณเลือกเมื่อกดให้ AI อ่านเท่านั้น')}</p>
        {document ? <><p className="break-words">{filename} · {document.pages} {t('pages', 'หน้า')}</p><details><summary className="min-h-[44px] cursor-pointer py-3">{t('Preview extracted text', 'ดูข้อความที่อ่านได้')}</summary><pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words font-body text-[14px]">{document.text}</pre></details>
          <label className="flex min-h-[44px] items-start gap-3"><input className="mt-1 h-5 w-5 accent-amber" type="checkbox" checked={allowSend} disabled={busy} onChange={e => setAllowSend(e.target.checked)} /><span>{t('Send this document’s text to the endpoint above for analysis.', 'ส่งข้อความของเอกสารนี้ไปยัง API ด้านบนเพื่อวิเคราะห์')}</span></label>
        </> : null}
        <Btn onClick={() => void study()} disabled={busy || !document || !allowSend || !connection.endpoint || !connection.model}>{busy ? t('Reading…', 'กำลังอ่าน…') : t('Study document', 'ให้ AI อ่านเอกสาร')}</Btn>
      </div>
    </div>
    {message ? <p role="status" className="border-l-2 border-amber bg-panel p-4 break-words">{message}</p> : null}
    {draft ? <div className="space-y-4 border-t-2 border-ink pt-5">
      <h3 className="font-display text-[32px] font-bold">{t('3. Review before filing', '3. ตรวจแล้วค่อยบันทึก')}</h3><p>{draft.summary}</p>
      {draft.warnings.map((w, i) => <p key={i} className="border-l-2 border-amber pl-3">{w}</p>)}
      {!draft.proposals.length ? <p>{t('No complete records found. Add missing details to the source and try again.', 'ไม่พบรายการที่ข้อมูลครบ เพิ่มข้อมูลที่ขาดในต้นฉบับแล้วลองอีกครั้ง')}</p> : null}
      {draft.proposals.map((p, i) => <article key={i} className="space-y-3 border border-line bg-panel p-4">
        <label className="flex min-h-[44px] items-center gap-3"><input className="h-5 w-5 accent-amber" type="checkbox" checked={selected.includes(i)} onChange={e => setSelected(s => e.target.checked ? [...s, i] : s.filter(n => n !== i))} /><span className="font-semibold">{names[p.kind]}</span></label>
        <blockquote className="border-l-2 border-line-2 pl-3 break-words">“{p.evidence}” {p.page ? `(${t('page', 'หน้า')} ${p.page})` : ''}</blockquote>
        <div className="grid gap-3 sm:grid-cols-2">{Object.entries(p.record).filter(([key]) => key !== 'id').map(([key, value]) => <label key={key} className="block break-words">{fieldLabel(key, t)}
          {key === 'type' ? <Select value={String(value)} onChange={e => edit(i, key, e.target.value)}><option value="opex">OpEx</option><option value="capex">CapEx</option></Select> : <Input type={typeof value === 'number' ? 'number' : /^(date|started)$/.test(key) ? 'date' : 'text'} min={typeof value === 'number' ? 0 : undefined} step="any" value={typeof value === 'object' ? JSON.stringify(value) : String(value)} onChange={e => edit(i, key, typeof value === 'number' ? Number(e.target.value) : e.target.value)} />}
        </label>)}</div>
      </article>)}
      <p>{t('Approval adds selected records to their modules and stores a source receipt in Hippocampus. AI uncertainty remains your review responsibility.', 'เมื่ออนุมัติ ระบบจะเพิ่มรายการที่เลือกในแต่ละโมดูล และเก็บหลักฐานใน Hippocampus โปรดตรวจความถูกต้องของข้อเสนอ AI ก่อนบันทึก')}</p>
      <div className="flex flex-wrap gap-3"><Btn disabled={!selected.length} onClick={approve}>{t(`Approve & file ${selected.length} records`, `อนุมัติและบันทึก ${selected.length} รายการ`)}</Btn><Btn variant="ghost" onClick={() => { setDraft(null); setSelected([]) }}>{t('Discard proposal', 'ทิ้งข้อเสนอ')}</Btn></div>
    </div> : null}
    <section className="space-y-3 border-t border-line-2 pt-4"><h3 className="font-display text-[14px] font-bold">Hippocampus · {t('Approved source trail', 'หลักฐานที่อนุมัติแล้ว')}</h3><p>{t('A record of what you approved, where it came from, and when. Original PDF files stay on your device; this trail stores the fingerprint and quoted evidence.', 'ดูรายการที่อนุมัติ แหล่งที่มา และเวลาบันทึก ไฟล์ PDF ต้นฉบับอยู่ในอุปกรณ์ของคุณ ระบบเก็บลายนิ้วมือดิจิทัลและข้อความอ้างอิง')}</p>
      {(store.intakeReceipts || []).slice().reverse().map(r => <details key={r.id} className="border border-line bg-panel p-4"><summary className="min-h-[44px] cursor-pointer break-words">{r.name} · {r.records.length} {t('records', 'รายการ')} · {new Date(r.approvedAt).toLocaleString()}</summary><p>{r.summary}</p><p className="break-all font-mono text-[11px]">SHA-256 {r.sha256}</p><p className="break-words">{r.provider}</p>{r.records.map(x => <p key={x.id} className="mt-2 break-words">{names[x.kind]}: {x.evidence}</p>)}</details>)}
      {!store.intakeReceipts?.length ? <p className="text-ink-2">{t('Your first approved document will appear here.', 'เอกสารแรกที่คุณอนุมัติจะปรากฏที่นี่')}</p> : null}
    </section>
  </section>
  function edit(i: number, key: string, value: unknown) {
    if (!draft) return
    const next = structuredClone(draft); next.proposals[i].record[key] = value; setDraft(next)
    try { parseDraft(next); setMessage('') } catch (e) { setMessage(e instanceof Error ? e.message : 'Invalid field') }
  }
}
function fieldLabel(key: string, t: (en: string, th: string) => string): string {
  const fields: Record<string, [string, string]> = { date: ['Date', 'วันที่'], vendor: ['Vendor', 'ผู้ขาย'], category: ['Category', 'หมวดหมู่'], type: ['Expense type', 'ประเภทรายจ่าย'], amount: ['Amount', 'จำนวนเงิน'], currency: ['Currency', 'สกุลเงิน'], owner: ['Owner', 'ผู้รับผิดชอบ'], source: ['Source', 'แหล่งที่มา'], taxId: ['Tax ID', 'เลขประจำตัวผู้เสียภาษี'], name: ['Name', 'ชื่อ'], role: ['Role', 'ตำแหน่ง'], salary: ['Monthly salary', 'เงินเดือน'], started: ['Start date', 'วันที่เริ่มงาน'], title: ['Deal title', 'ชื่อโครงการ'], client: ['Customer', 'ลูกค้า'], totalValue: ['Deal value', 'มูลค่าโครงการ'] }
  return fields[key] ? t(...fields[key]) : key
}
