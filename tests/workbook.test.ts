import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildAxiomMockStore } from '../src/data/axiom-mock'
import { encodeWorkbook, decodeWorkbook } from '../src/services/workbook'
import { approveDraft } from '../src/lib/intake'

test('real XLSX round trip preserves TH/EN, IDs, zero, false, JSON and approved evidence', async () => {
  let state = buildAxiomMockStore()
  state.companyName = 'บริษัท ทดสอบ Example'
  state.company = { legalName: state.companyName, reg: '0012345678901' }
  state.projects[0].checklist = [{ k: 'ตรวจสอบ / Review', done: false }]
  state.projects[0].received = 0
  state.employees.push({ id: '001', name: '=HYPERLINK("https://bad.invalid")', role: 'ทดสอบ', salary: 0, currency: 'THB', started: '2026-10-05' })
  state = approveDraft(state, { summary: 'ทดสอบ', warnings: [], proposals: [{ kind: 'expenses', evidence: 'Sample receipt', record: { vendor: 'ตัวอย่าง', date: '2026-10-05', category: 'Office', amount: 0, currency: 'THB', type: 'opex', owner: 'Example' } }] }, [0], { name: 'sample.pdf', sha256: 'b'.repeat(64), provider: 'Test', summary: 'ทดสอบ' })
  const bytes = await encodeWorkbook(state)
  assert.deepEqual(await decodeWorkbook(bytes.slice().buffer), state)
})
test('workbook imports reject formulas and missing tabs before reaching the store', async () => {
  const { default: ExcelJS } = await import('exceljs')
  const bytes = await encodeWorkbook(buildAxiomMockStore())
  const book = new ExcelJS.Workbook(); await book.xlsx.load(bytes.slice().buffer)
  book.getWorksheet('expenses')!.getCell('A2').value = { formula: '1+1', result: 2 }
  await assert.rejects(decodeWorkbook(new Uint8Array(await book.xlsx.writeBuffer()).buffer), /Formula/)
  book.removeWorksheet(book.getWorksheet('employees')!.id)
  await assert.rejects(decodeWorkbook(new Uint8Array(await book.xlsx.writeBuffer()).buffer), /tab|Formula/)
})
