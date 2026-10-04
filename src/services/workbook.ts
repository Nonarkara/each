import type { EachStore } from '../lib/types'
import { validateStore } from '../lib/validation'
import { decodeCell, mirrorCollections, mirrorHeaders, safeCell } from '../lib/mirror'

export async function encodeWorkbook(store: EachStore): Promise<Uint8Array> {
  validateStore(store)
  const { default: ExcelJS } = await import('exceljs')
  const book = new ExcelJS.Workbook()
  book.creator = 'EACH'; book.created = new Date()
  const guide = book.addWorksheet('Start here')
  guide.addRows([
    ['EACH · Data mirror / สำเนาข้อมูล', 'Instructions / วิธีใช้'],
    ['1. Edit values / แก้ไขค่า', 'Keep tab names, field headers, and IDs. / คงชื่อแท็บ หัวตาราง และ ID'],
    ['2. Import / นำเข้า', 'Data mirrors → Review Excel. Review additions, changes and deletions. / สำเนาข้อมูล → ตรวจ Excel แล้วตรวจรายการเปลี่ยนแปลง'],
    ['3. Approve / อนุมัติ', 'Approve to update your workspace. Export again for a fresh mirror. / อนุมัติ แล้วส่งออกอีกครั้งเพื่ออัปเดตสำเนา'],
    ['Nested fields / ข้อมูลซ้อน', 'checklist, notes, files, records are JSON. Paste values, not formulas. / ใช้ JSON และวางเป็นค่า ไม่ใช้สูตร'],
    ['Source / แหล่งที่มา', store.companyName], ['As of / วันที่ข้อมูล', store.asOf],
    ['Sync mode / วิธีซิงค์', 'Two-way file exchange; this workbook does not sync automatically. / รับส่งสองทางผ่านไฟล์ ไม่มีซิงค์อัตโนมัติ'],
  ])
  const meta = book.addWorksheet('Metadata'); meta.addRow(['key', 'value'])
  Object.entries(store).filter(([key]) => !mirrorCollections.includes(key as typeof mirrorCollections[number])).forEach(([k, v]) => meta.addRow([k, v === null ? 'null' : safeCell(v)]))
  for (const key of mirrorCollections) {
    const sheet = book.addWorksheet(key)
    const headers = mirrorHeaders[key]
    sheet.addRow(headers)
    for (const row of store[key] || []) sheet.addRow(headers.map(h => (row as unknown as Record<string, unknown>)[h] === undefined ? null : safeCell((row as unknown as Record<string, unknown>)[h])))
    sheet.views = [{ state: 'frozen', ySplit: 1 }]
    sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: headers.length } }
  }
  for (const sheet of book.worksheets) {
    sheet.getRow(1).font = { name: 'Source Sans 3', bold: true, color: { argb: 'FF191712' } }
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF59E0B' } }
    sheet.columns.forEach(c => { c.width = 24 })
  }
  guide.getColumn(2).width = 90
  return new Uint8Array(await book.xlsx.writeBuffer())
}
export async function exportWorkbook(store: EachStore): Promise<void> {
  const buffer = await encodeWorkbook(store)
  const url = URL.createObjectURL(new Blob([new Uint8Array(buffer)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
  const a = document.createElement('a'); a.href = url; a.download = `EACH-${store.asOf}.xlsx`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
}
export async function readWorkbook(file: File): Promise<EachStore> {
  if (file.size > 10_000_000 || !/\.xlsx$/i.test(file.name)) throw new Error('Choose an .xlsx file up to 10 MB / เลือก .xlsx ไม่เกิน 10 MB')
  return decodeWorkbook(await file.arrayBuffer())
}
export async function decodeWorkbook(bytes: ArrayBuffer): Promise<EachStore> {
  if (bytes.byteLength > 10_000_000) throw new Error('Workbook exceeds the 10 MB limit')
  const { default: ExcelJS } = await import('exceljs')
  const book = new ExcelJS.Workbook()
  await book.xlsx.load(bytes)
  const meta = book.getWorksheet('Metadata')
  if (!meta || meta.rowCount > 100) throw new Error('Missing or invalid Metadata tab')
  const result: Record<string, unknown> = {}
  const allowedMeta = new Set(['onboarded', 'company', 'companyName', 'currency', 'asOf', 'gmailConnected', 'gmailImported', 'dataTenant', 'schemaVersion', 'fxRates'])
  meta.eachRow((row, n) => {
    if (n === 1) return
    const key = String(row.getCell(1).value)
    if (!allowedMeta.has(key) || Object.hasOwn(result, key)) throw new Error('Invalid or duplicate metadata key')
    result[key] = decodeCell(row.getCell(2).value)
  })
  for (const key of mirrorCollections) {
    const sheet = book.getWorksheet(key)
    if (!sheet || sheet.rowCount > 10001 || sheet.columnCount > 30) throw new Error(`Missing or oversized tab: ${key}`)
    const headers = mirrorHeaders[key]
    if (headers.some((h, i) => sheet.getRow(1).getCell(i + 1).value !== h)) throw new Error(`Keep the original headers in ${key} / กรุณาคงหัวตารางเดิม`)
    const rows: Record<string, unknown>[] = []
    sheet.eachRow((row, n) => {
      if (n === 1) return
      if (headers.every((_, i) => row.getCell(i + 1).value === null || row.getCell(i + 1).value === '')) return
      const obj: Record<string, unknown> = {}
      headers.forEach((h, i) => { const raw = row.getCell(i + 1).value; if (raw !== null) obj[h] = decodeCell(raw) })
      if (Object.keys(obj).length) rows.push(obj)
    })
    result[key] = rows
  }
  return validateStore(result)
}
