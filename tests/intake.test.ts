import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildAxiomMockStore } from '../src/data/axiom-mock'
import { approveDraft, parseDraft, type IntakeDraft } from '../src/lib/intake'
import { applyReviewedMirror, canonical, decodeCell, mirrorChanges, safeCell } from '../src/lib/mirror'
import { studyDocument, validateEndpoint } from '../src/services/intelligence'
import { validateStore } from '../src/lib/validation'
const draft = (): IntakeDraft => ({ summary: 'Office receipt / ใบเสร็จ', warnings: [], proposals: [{ kind: 'expenses', evidence: 'Paper 120 THB on 2026-10-05', page: 1, record: { date: '2026-10-05', vendor: 'Example vendor', category: 'Office', type: 'opex', amount: 120, currency: 'THB', owner: 'Founder' } }] })
const source = { name: 'receipt.pdf', sha256: 'a'.repeat(64), provider: 'Test provider', summary: 'Reviewed' }

test('studying and parsing never writes; approval adds only selected records with provenance', () => {
  const before = buildAxiomMockStore(), untouched = structuredClone(before)
  const d = parseDraft(draft())
  assert.deepEqual(before, untouched)
  const next = approveDraft(before, d, [0], source)
  assert.equal(next.expenses.length, before.expenses.length + 1)
  assert.equal(next.intakeReceipts?.[0].records[0].id, next.expenses.at(-1)?.id)
  assert.equal(next.intakeReceipts?.[0].sha256, source.sha256)
  assert.deepEqual(before, untouched)
})
test('failed or empty approvals are atomic, and duplicate document filing is refused', () => {
  const before = buildAxiomMockStore()
  assert.throws(() => approveDraft(before, draft(), [], source), /Select/)
  assert.throws(() => approveDraft(before, draft(), [0, 0], source), /Select/)
  assert.throws(() => approveDraft(before, draft(), [99], source), /Unknown/)
  const next = approveDraft(before, draft(), [0], source)
  assert.throws(() => approveDraft(next, draft(), [0], source), /already filed/)
  assert.equal(before.intakeReceipts, undefined)
})
test('invented types, incomplete records, impossible dates and negative amounts cannot file', () => {
  for (const mutate of [(d: IntakeDraft) => { d.proposals[0].kind = 'loans' as never }, (d: IntakeDraft) => { delete d.proposals[0].record.owner }, (d: IntakeDraft) => { d.proposals[0].record.amount = -1 }, (d: IntakeDraft) => { d.proposals[0].record.date = '2026-02-30' }, (d: IntakeDraft) => { d.proposals[0].record.type = 'credit' }]) {
    const d = draft(); mutate(d); assert.throws(() => parseDraft(d))
  }
})
test('foreign currency approval requires an explicit exchange rate', () => {
  const before = buildAxiomMockStore(); const d = draft(); d.proposals[0].record.currency = 'EUR'
  assert.throws(() => approveDraft(before, d, [0], source), /exchange rate/)
  assert.equal(before.intakeReceipts, undefined)
})
test('mirror diff includes deletions and reviewed imports reject intervening edits and other tenants', () => {
  const before = buildAxiomMockStore(), after = structuredClone(before)
  after.expenses.pop(); after.employees.push({ id: 'new', name: 'Sample', role: 'Operator', salary: 1, currency: 'THB', started: '2026-10-05' })
  const diff = mirrorChanges(before, after)
  assert.equal(diff.changes.find(x => x.collection === 'expenses')?.removed, 1)
  assert.equal(diff.changes.find(x => x.collection === 'employees')?.added, 1)
  assert.equal(applyReviewedMirror(before, before, after).expenses.length, after.expenses.length)
  assert.throws(() => applyReviewedMirror({ ...before, asOf: '2026-10-05' }, before, after), /changed during review/)
  assert.throws(() => applyReviewedMirror(before, before, { ...after, dataTenant: 'abc' }), /different workspace/)
})
test('mirror cells preserve identifiers, nested JSON, zero and false without formula execution', () => {
  for (const val of ['001234', '=HYPERLINK("bad")', '+123', '@name', '-99', 0, false, { checklist: [{ k: 'Do it', done: false }] }]) assert.deepEqual(decodeCell(safeCell(val)), val)
  assert.throws(() => decodeCell({ formula: '1+1', result: 2 }), /Formula/)
  assert.equal(canonical({ b: 1, a: 2 }), canonical({ a: 2, b: 1 }))
})
test('malformed nested project and source-trail data is rejected at the import boundary', () => {
  const s = buildAxiomMockStore(); s.projects[0].notes = [{ at: 'now', t: 99 as never }]
  assert.throws(() => validateStore(s), /project details/)
  const next = approveDraft(buildAxiomMockStore(), draft(), [0], source)
  next.intakeReceipts![0].sha256 = 'broken'
  assert.throws(() => validateStore(next), /source receipt/)
})
test('AI endpoint refuses insecure remote HTTP and embedded credentials', () => {
  assert.throws(() => validateEndpoint('http://remote.example/v1'), /HTTPS/)
  assert.throws(() => validateEndpoint('https://user:secret@example.com/v1'), /credentials/)
  assert.throws(() => validateEndpoint('https://example.com/v1?key=secret'), /credentials/)
  assert.equal(validateEndpoint('http://127.0.0.1:11434/v1').hostname, '127.0.0.1')
})
test('provider failures and hallucinated evidence are refused without writes', async () => {
  const original = globalThis.fetch
  const connection = { endpoint: 'https://test.invalid/v1', model: 'test', key: '' }
  const document = { text: 'Paper 120 THB on 2026-10-05', sha256: source.sha256, pages: 1 }
  try {
    globalThis.fetch = async () => new Response('no', { status: 401 })
    await assert.rejects(studyDocument(document, connection, 'THB'), /401/)
    const d = draft(); d.proposals[0].evidence = 'Invented source'
    globalThis.fetch = async () => Response.json({ choices: [{ message: { content: JSON.stringify(d) } }] })
    await assert.rejects(studyDocument(document, connection, 'THB'), /evidence/)
    d.proposals[0].evidence = document.text; d.proposals[0].page = 2
    await assert.rejects(studyDocument(document, connection, 'THB'), /evidence/)
    d.proposals[0].page = 1
    assert.deepEqual(await studyDocument(document, connection, 'THB'), d)
  } finally { globalThis.fetch = original }
})
